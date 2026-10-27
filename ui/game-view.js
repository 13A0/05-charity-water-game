import { upgrades } from "../data/content.js";
import { fmt, decimal, time } from "./format.js";
const setText = (element, value) => {
  const text = String(value);
  if (element.textContent !== text) element.textContent = text;
};
export function createGameView(game, dialog) {
  const elements = new Map();
  const $ = (id) => {
    if (!elements.has(id)) elements.set(id, document.getElementById(id));
    return elements.get(id);
  };
  const previous = {};
  const progress = document.querySelector(".progress");
  const pumpLabel = $("pump").querySelector("span");
  const shop = new Map(
    upgrades.map((u) => {
      const button = $(`upgrade-${u.id}`);
      return [
        u.id,
        {
          button,
          level: button.querySelector(".level"),
          price: button.querySelector(".upgrade-price"),
        },
      ];
    }),
  );
  return function render() {
    const r = game.run,
      p = game.project,
      rates = game.rates();
    setText($("kp"), fmt(game.state.points));
    $("pump").disabled = !r || game.blocked || dialog.element.open;
    if (!r) {
      for (const { button } of shop.values()) button.disabled = true;
      $("restart").disabled = true;
      setText($("pause"), "Choose expedition →");
      return;
    }
    $("restart").disabled = dialog.element.open || r.mode === "complete";
    setText($("location"), p.location.toUpperCase());
    setText($("project-title"), p.name);
    setText(
      $("difficulty"),
      `${p.difficulty} · Expedition ${(p.stage ?? 0) + 1}`,
    );
    setText($("produced"), fmt(r.produced));
    setText($("goal"), fmt(p.goal));
    setText($("wallet"), fmt(r.wallet));
    setText($("time"), time(r.elapsed));
    const percent = Math.min(100, (r.produced / p.goal) * 100);
    $("progress-fill").style.width = `${percent}%`;
    progress.setAttribute("aria-valuenow", Math.floor(percent));
    setText($("percent"), `${Math.floor(percent)}%`);
    const objectives = [];
    if (p.minPumps)
      objectives.push(
        `${Math.min(r.pumps, p.minPumps)} / ${p.minPumps} manual pumps`,
      );
    if (p.minUpgrades)
      objectives.push(
        `${Math.min(
          Object.values(r.levels).reduce((a, b) => a + b, 0),
          p.minUpgrades,
        )} / ${p.minUpgrades} equipment levels`,
      );
    setText(
      $("objective"),
      objectives.length
        ? `Field objectives: ${objectives.join(" · ")}`
        : "Every drop brings the village to life.",
    );
    setText($("conditions"), p.condition);
    setText($("manual-rate"), `${decimal(rates.tap)} L / pump`);
    setText($("auto-rate"), `${decimal(rates.auto)} L / sec`);
    setText(
      pumpLabel,
      `+${decimal(rates.tap * (r.streak >= 5 ? 1.5 + (game.permanent().combo || 0) : 1))} L / pump`,
    );
    setText(
      $("status"),
      r.mode === "complete"
        ? "CLEAN WATER IS FLOWING"
        : dialog.element.open || r.mode === "paused"
          ? "EXPEDITION PAUSED"
          : "WATER IN MOTION",
    );
    setText(
      $("streak"),
      r.streak >= 5
        ? `IN THE FLOW · ×${decimal(1.5 + (game.permanent().combo || 0))}`
        : `FIND YOUR FLOW · ${r.streak} / 5`,
    );
    $("streak").classList.toggle("active", r.streak >= 5);
    setText(
      $("pause"),
      r.mode === "complete"
        ? "Next expedition →"
        : r.mode === "paused"
          ? "Resume →"
          : "Pause",
    );
    $("scene").classList.toggle(
      "automated",
      !game.blocked && !dialog.element.open && rates.auto > 0,
    );
    $("village").style.opacity = 0.4 + (0.6 * percent) / 100;
    for (const u of upgrades) {
      const { button: b, level, price } = shop.get(u.id);
      const cost = game.cost(u.id);
      setText(level, `LV ${r.levels[u.id] || 0}`);
      setText(price, `${fmt(cost)} L ↗`);
      b.disabled = game.blocked || dialog.element.open || r.wallet < cost;
      b.classList.toggle("affordable", !b.disabled);
    }
    const milestonesKey = JSON.stringify(r.milestones);
    if (previous.milestones !== milestonesKey) {
      previous.milestones = milestonesKey;
      $("milestones").innerHTML = [25, 50, 75]
        .map(
          (n) =>
            `<span class="mile ${r.milestones.includes(n) ? "done" : ""}">${r.milestones.includes(n) ? "✓ " : ""}${n}%</span>`,
        )
        .join("");
    }
    const effectsKey = JSON.stringify(
      r.effects.map(({ left, ...effect }) => ({
        ...effect,
        left: Math.ceil(left),
      })),
    );
    if (previous.effects !== effectsKey) {
      previous.effects = effectsKey;
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
    }
    const journalKey = JSON.stringify(r.log.slice(0, 3));
    if (previous.journal !== journalKey) {
      previous.journal = journalKey;
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
  };
}
