import { Game } from "./engine.js";
import { load, save } from "./save.js";
import { upgrades, rewards, skills, events } from "../data/content.js";
import { AssetManager, AudioManager } from "./assets.js";
import { Dialog } from "../ui/dialog.js";
const $ = (id) => document.getElementById(id),
  fmt = (n) => Math.floor(n).toLocaleString("en-US"),
  decimal = (n) => n.toLocaleString("en-US", { maximumFractionDigits: 1 }),
  time = (n) =>
    `${String(Math.floor(n / 60)).padStart(2, "0")}:${String(Math.floor(n % 60)).padStart(2, "0")}`;
let storage;
try {
  storage = window.localStorage;
} catch {
  storage = {
    getItem() {
      throw Error();
    },
    setItem() {
      throw Error();
    },
  };
}
const restored = load(storage),
  game = new Game(restored.state),
  art = new AssetManager(),
  audio = new AudioManager(),
  dialog = new Dialog($("dialog"));
let shown = null,
  menu = null,
  last = performance.now(),
  saveTime = 0,
  pumpTimer;
const notice = (text) => ($("notice").textContent = text);
function persist() {
  const ok = save(storage, game.state);
  $("save-status").textContent = ok
    ? "Progress saved on this device"
    : "Saving unavailable — keep this tab open";
}
art.mount($("scene"), "landscape");
art.mount($("pump-sprite"), "pump");
$("village").src = art.src("village");
$("water-effect").src = art.src("water");
for (const u of upgrades) {
  const button = document.createElement("button");
  button.className = "upgrade";
  button.id = `upgrade-${u.id}`;
  button.innerHTML = `<img src="${art.src(u.icon)}" alt=""><span><span class="level"></span><strong>${u.name}</strong><span class="description">${u.description}</span></span><span class="upgrade-price"></span>`;
  button.onclick = () => {
    if (dialog.element.open) return;
    if (game.buy(u.id)) {
      audio.play("purchase");
      notice(
        `${u.name} improved. Your contributed water stays with the community.`,
      );
      button.classList.remove("purchase-flash");
      void button.offsetWidth;
      button.classList.add("purchase-flash");
      sync();
      persist();
    }
  };
  $("upgrades").append(button);
}
function render() {
  const r = game.run,
    p = game.project,
    rates = game.rates();
  $("kp").textContent = fmt(game.state.points);
  $("pump").disabled = !r || game.blocked || dialog.element.open;
  if (!r) {
    $("pause").textContent = "Choose expedition →";
    return;
  }
  $("location").textContent = p.location.toUpperCase();
  $("project-title").textContent = p.name;
  $("difficulty").textContent = `${p.difficulty} expedition`;
  $("produced").textContent = fmt(r.produced);
  $("goal").textContent = fmt(p.goal);
  $("wallet").textContent = fmt(r.wallet);
  $("time").textContent = time(r.elapsed);
  const percent = Math.min(100, (r.produced / p.goal) * 100);
  $("progress-fill").style.width = `${percent}%`;
  document
    .querySelector(".progress")
    .setAttribute("aria-valuenow", Math.floor(percent));
  $("percent").textContent = `${Math.floor(percent)}%`;
  $("objective").textContent = p.minPumps
    ? `Field objective: ${Math.min(r.pumps, p.minPumps)} / ${p.minPumps} manual pumps`
    : p.minUpgrades
      ? `Field objective: ${Math.min(
          Object.values(r.levels).reduce((a, b) => a + b, 0),
          p.minUpgrades,
        )} / ${p.minUpgrades} equipment levels`
      : "Every drop brings the village to life.";
  $("conditions").textContent = p.condition;
  $("manual-rate").textContent = `${decimal(rates.tap)} L / pump`;
  $("auto-rate").textContent = `${decimal(rates.auto)} L / sec`;
  $("pump").querySelector("span").textContent =
    `+${decimal(rates.tap * (r.streak >= 5 ? 1.5 + (game.permanent().combo || 0) : 1))} L / pump`;
  $("status").textContent =
    r.mode === "complete"
      ? "CLEAN WATER IS FLOWING"
      : dialog.element.open || r.mode === "paused"
        ? "EXPEDITION PAUSED"
        : "WATER IN MOTION";
  $("streak").textContent =
    r.streak >= 5
      ? `IN THE FLOW · ×${decimal(1.5 + (game.permanent().combo || 0))}`
      : `FIND YOUR FLOW · ${r.streak} / 5`;
  $("streak").classList.toggle("active", r.streak >= 5);
  $("pause").textContent =
    r.mode === "complete"
      ? "Next expedition →"
      : r.mode === "paused"
        ? "Resume →"
        : "Pause";
  $("scene").classList.toggle(
    "automated",
    !game.blocked && !dialog.element.open && rates.auto > 0,
  );
  $("village").style.opacity = 0.4 + (0.6 * percent) / 100;
  for (const u of upgrades) {
    const b = $(`upgrade-${u.id}`);
    b.querySelector(".level").textContent = `LV ${r.levels[u.id] || 0}`;
    b.querySelector(".upgrade-price").textContent =
      `${fmt(game.cost(u.id))} L ↗`;
    b.disabled =
      game.blocked || dialog.element.open || r.wallet < game.cost(u.id);
    b.classList.toggle("affordable", !b.disabled);
  }
  $("milestones").innerHTML = [25, 50, 75]
    .map(
      (n) =>
        `<span class="mile ${r.milestones.includes(n) ? "done" : ""}">${r.milestones.includes(n) ? "✓ " : ""}${n}%</span>`,
    )
    .join("");
  $("effects").replaceChildren(
    ...r.effects.map((e) => {
      const span = document.createElement("span");
      span.className = "effect";
      const mods = [
        ["production", "production"],
        ["manual", "manual"],
        ["auto", "automation"],
        ["cost", "equipment cost"],
      ]
        .filter(([key]) => e[key] !== undefined)
        .map(
          ([key, label]) =>
            `${Math.round((e[key] - 1) * 100) > 0 ? "+" : ""}${Math.round((e[key] - 1) * 100)}% ${label}`,
        )
        .join(", ");
      span.textContent = `${e.name}: ${mods} · ${Math.ceil(e.left)}s`;
      return span;
    }),
  );
  $("journal").replaceChildren(
    ...(r.log.length
      ? r.log
      : ["A new expedition. Make your first drop count."]
    )
      .slice(0, 3)
      .map((text) => {
        const p = document.createElement("p");
        p.textContent = text;
        return p;
      }),
  );
}
function dismiss() {
  dialog.close();
  menu = null;
  shown = null;
  last = performance.now();
  sync();
  persist();
}
function sync() {
  const pending = game.run?.pending;
  if (!menu && pending && shown !== pending) {
    shown = pending;
    if (pending.type === "milestone") showMilestone(pending);
    else if (pending.type === "event") showEvent(pending);
    else showResults();
  }
  render();
}
function showMilestone(p) {
  audio.play("milestone");
  dialog.choices({
    eyebrow: `${p.percent}% MILESTONE / FIELD UPGRADE`,
    title: "A little extra momentum.",
    description:
      "The community is growing. Choose one free upgrade for this expedition.",
    items: p.choices.map((id) => ({ ...rewards.find((x) => x.id === id) })),
    onConfirm: (id) => {
      if (game.chooseReward(id)) {
        notice("Milestone upgrade installed. Keep the water flowing!");
        dismiss();
      }
    },
  });
}
function showEvent(p) {
  const e = events.find((e) => e.id === p.id);
  dialog.choices({
    eyebrow: e.category.toUpperCase(),
    title: e.name,
    description: e.description,
    items: e.choices.map((c, i) => ({
      id: i,
      name: c.name,
      description: c.description,
      meta: `${c.cost ? `Cost: ${fmt(game.eventCost(c))} L · ` : ""}${c.skill && !game.state.skills.includes(c.skill) ? "Requires Repair protocol" : `Available: ${fmt(game.run.wallet)} L`}`,
      disabled:
        game.run.wallet < game.eventCost(c) ||
        (c.skill && !game.state.skills.includes(c.skill)),
    })),
    onConfirm: (id) => {
      if (game.chooseEvent(id)) {
        notice(game.run.log[0]);
        dismiss();
      }
    },
  });
}
function showResults() {
  const r = game.run;
  audio.play("complete");
  $("scene").classList.add("celebrate");
  dialog.show(
    `<div class="results-symbol" aria-hidden="true">✦</div><p class="eyebrow">PROJECT COMPLETE / CLEAN WATER IS FLOWING</p><h2>A community. A new beginning.</h2><p>${game.project.location} has a reliable water supply. Your knowledge carries forward.</p><div class="result-grid"><div><strong>+${r.reward} KP</strong><small>Permanent knowledge earned</small></div><div><strong>${time(r.elapsed)}</strong><small>Active expedition time</small></div><div><strong>${fmt(r.produced)} L</strong><small>Total water contributed</small></div><div><strong>${Object.values(r.levels).reduce((a, b) => a + b, 0)}</strong><small>Equipment levels acquired</small></div><div><strong>${r.eventCount}</strong><small>Events encountered</small></div><div><strong>${r.bonuses.length}</strong><small>Milestone decisions</small></div></div><p>By hand: ${fmt(r.manualWater)} L · By machine: ${fmt(r.autoWater)} L</p><div class="dialog-actions"></div>`,
  );
  const actions = dialog.body.querySelector(".dialog-actions");
  actions.append(
    dialog.button("Explore permanent skills", () => showSkills("complete")),
    dialog.button("Choose next expedition →", showProjects),
  );
  persist();
}
function showProjects() {
  menu = "projects";
  game.offers();
  persist();
  dialog.choices({
    eyebrow: "YOUR NEXT CHAPTER / CHOOSE ONE OF THREE",
    title: "Where will you make a difference?",
    description:
      "Knowledge and skills stay with you. Water, equipment, milestones and temporary effects start fresh.",
    items: game.offers().map((p) => ({
      id: p.id,
      name: p.name,
      description: `${p.location}. ${p.description}`,
      meta: `${p.difficulty.toUpperCase()} · ${fmt(p.goal)} L · ${p.kp + (game.permanent().kp || 0)} KP<br>${p.condition}<br>Objective: ${p.objective}`,
    })),
    onConfirm: (id) => {
      if (game.start(id)) {
        menu = null;
        shown = null;
        dialog.close();
        $("scene").classList.remove("celebrate");
        notice(
          "Expedition underway. Pump or press Space to get water flowing.",
        );
        persist();
        sync();
      }
    },
    extra: (actions) =>
      actions.append(
        dialog.button(
          "Permanent skill tree",
          () => showSkills("projects"),
          false,
          "secondary",
        ),
      ),
  });
  render();
}
function showSkills(back = "game") {
  menu = "skills";
  dialog.show(
    `<p class="eyebrow">PERMANENT PROGRESSION / ${game.state.points} KNOWLEDGE POINTS</p><h2>Good ideas travel further.</h2><p>Follow a branch, or combine disciplines. Skills apply immediately and stay with you across expeditions.</p><p class="input-hint">Release controls before choosing a skill.</p><div class="skill-tree"></div><div class="dialog-actions"></div>`,
  );
  const tree = dialog.body.querySelector(".skill-tree");
  for (const branch of [...new Set(skills.map((s) => s.branch))]) {
    const col = document.createElement("section");
    col.className = "skill-branch";
    const h = document.createElement("h3");
    h.textContent = branch;
    col.append(h);
    for (const s of skills.filter((s) => s.branch === branch)) {
      const owned = game.state.skills.includes(s.id),
        locked = !s.requires.every((id) => game.state.skills.includes(id));
      const b = dialog.button(
        "",
        () => {
          dialog.choices({
            eyebrow: `${s.branch.toUpperCase()} / PERMANENT SKILL`,
            title: s.name,
            description: s.description,
            items: [
              {
                id: s.id,
                name: `Unlock for ${s.cost} KP`,
                description: `You have ${game.state.points} KP. This bonus persists through every future expedition.`,
              },
            ],
            onConfirm: (id) => {
              if (game.unlock(id)) {
                audio.play("purchase");
                persist();
                showSkills(back);
                render();
              }
            },
            extra: (actions) =>
              actions.append(
                dialog.button(
                  "Back to tree",
                  () => showSkills(back),
                  false,
                  "secondary",
                ),
              ),
          });
        },
        owned || locked || game.state.points < s.cost,
        `skill-node ${owned ? "owned" : ""}`,
      );
      b.innerHTML = `<strong>${s.name}</strong><span>${s.description}</span><small>${owned ? "✓ Unlocked" : locked ? `Requires ${skills.find((k) => k.id === s.requires[0]).name}` : `${s.cost} KP · ${game.state.points >= s.cost ? "Available" : "Save more knowledge"}`}</small>`;
      col.append(b);
    }
    tree.append(col);
  }
  dialog.body.querySelector(".dialog-actions").append(
    dialog.button(
      back === "game" ? "Return to expedition" : "Back to expedition planning",
      () => {
        menu = null;
        if (back === "complete") {
          shown = game.run.pending;
          showResults();
        } else if (back === "projects") showProjects();
        else dismiss();
      },
    ),
  );
  render();
}
function help() {
  menu = "help";
  dialog.show(
    `<p class="eyebrow">YOUR FIELD GUIDE</p><h2>Make every drop count.</h2><ol class="guide"><li>Pump water by clicking the yellow button or pressing <b>Space</b>. Five pumps within 1.2 seconds build a ×1.5 streak.</li><li><b>Available water</b> buys equipment. <b>Contributed water</b> only increases. Equipment is temporary; experiment with combinations.</li><li>At 25%, 50% and 75%, select a free upgrade, then confirm it. All decisions pause production and timers.</li><li>Events change production or equipment costs. Read the trade-offs. Negative effects expire during active play; there is no game-over.</li><li>Fill the target and finish the field objective to earn permanent KP. Spend it in four connected skill branches, then choose a new expedition.</li><li>Projects can be replayed. Easy expeditions always remain available. Saves include your current run and pending choices.</li></ol><p>Press P to pause. Hidden tabs pause automatically; there is no offline production. Sounds and artwork are replaceable placeholders. Manual rate excludes combo and critical bonuses.</p><div class="dialog-actions"></div>`,
  );
  dialog.body
    .querySelector(".dialog-actions")
    .append(dialog.button("Back to the field", dismiss));
  render();
}
function pump() {
  if (dialog.element.open) return;
  const result = game.pump();
  if (!result) return;
  art.animate($("pump-sprite"), "pump");
  $("scene").classList.add("pumping");
  clearTimeout(pumpTimer);
  pumpTimer = setTimeout(() => $("scene").classList.remove("pumping"), 500);
  const f = document.createElement("span");
  f.className = `floating ${result.crit ? "crit" : ""}`;
  f.textContent = `${result.crit ? "PERFECT! " : ""}+${decimal(result.amount)}`;
  $("floats").append(f);
  setTimeout(() => f.remove(), 1000);
  audio.play("pump");
  sync();
  if (game.run.pending) persist();
}
function toggle() {
  if (dialog.element.open) return;
  if (!game.run || game.run.mode === "complete") {
    showProjects();
    return;
  }
  game.run.mode = game.run.mode === "paused" ? "running" : "paused";
  last = performance.now();
  persist();
  render();
}
// Activate on release, never key repeat. The native button remains accessible with Enter/Space.
let pumpKey = null;
$("pump").onclick = pump;
$("pump").addEventListener("keydown", (e) => {
  if (["Space", "Enter"].includes(e.code) && e.repeat) e.preventDefault();
});
$("pause").onclick = toggle;
$("restart").onclick = () => {
  if (!game.run || game.run.mode === "complete" || dialog.element.open) return;
  menu = "restart";
  dialog.choices({
    eyebrow: "START AGAIN / KEEP YOUR KNOWLEDGE",
    title: "A fresh start?",
    description:
      "This expedition�s water, equipment and effects will reset. Permanent skills and knowledge stay with you.",
    items: [
      {
        id: "restart",
        name: "Restart this expedition",
        description: "Return to the same community with a fresh setup.",
      },
    ],
    onConfirm: () => {
      if (game.restart()) dismiss();
    },
    extra: (actions) =>
      actions.append(
        dialog.button("Keep playing", dismiss, false, "secondary"),
      ),
  });
  render();
};
$("skills").onclick = () =>
  showSkills(
    game.run?.mode === "complete" ? "complete" : game.run ? "game" : "projects",
  );
$("help").onclick = help;
$("sound").onclick = () => {
  const enabled = audio.toggle();
  $("sound").textContent = enabled ? "Sound on" : "Sound off";
  $("sound").setAttribute("aria-pressed", String(enabled));
  audio.play("ui");
};
document.addEventListener("keydown", (e) => {
  if (dialog.element.open || e.repeat) return;
  if (
    e.code === "Space" &&
    !["BUTTON", "A", "INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName)
  ) {
    e.preventDefault();
    pumpKey = e.code;
  }
  if (e.code === "KeyP") toggle();
});
document.addEventListener("keyup", (e) => {
  if (e.code === pumpKey) {
    pumpKey = null;
    if (!dialog.element.open) pump();
  }
});
document.addEventListener("visibilitychange", () => {
  pumpKey = null;
  if (document.hidden && game.run?.mode === "running") game.run.mode = "paused";
  last = performance.now();
  persist();
  render();
});
window.addEventListener("pagehide", persist);
window.addEventListener("blur", () => {
  pumpKey = null;
});
function loop(now) {
  const dt = (now - last) / 1000;
  last = now;
  if (!dialog.element.open && !document.hidden) game.tick(dt);
  sync();
  if (now - saveTime > 3000) {
    persist();
    saveTime = now;
  }
  requestAnimationFrame(loop);
}
notice(restored.message);
if (!game.run) showProjects();
else {
  game.run.mode = game.run.mode === "complete" ? "complete" : "paused";
  sync();
}
render();
requestAnimationFrame(loop);
