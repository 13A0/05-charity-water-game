import test from "node:test";
import assert from "node:assert/strict";
import { Game, fresh } from "../scripts/engine.js";
import { validate, load, save, KEY } from "../scripts/save.js";
import { projects, skills, events } from "../data/content.js";
const newGame = () => {
  const g = new Game(fresh(), () => 0.1);
  g.state.offers = ["village"];
  g.start("village");
  return g;
};
function rewards(g) {
  while (g.run.pending?.type === "milestone")
    g.chooseReward(g.run.pending.choices[0]);
}
test("wallet spending never subtracts contributed water", () => {
  const g = newGame();
  g.add(200, "manual");
  assert.equal(g.buy("solar"), true);
  assert.equal(g.run.wallet, 70);
  assert.equal(g.run.produced, 200);
  assert.equal(g.rates().auto, 8);
});
test("large gains queue every milestone once before completion; no duplicate rewards", () => {
  const g = newGame();
  g.add(1000, "manual");
  assert.deepEqual(g.run.milestones, [25, 50, 75]);
  assert.equal(g.state.points, 0);
  assert.equal(g.pump(), null);
  for (let i = 0; i < 3; i++) {
    const id = g.run.pending.choices[0];
    assert(g.chooseReward(id));
  }
  assert.equal(g.run.mode, "complete");
  assert.equal(g.state.points, 1);
  assert.equal(g.chooseReward("hands"), false);
  g.check();
  assert.equal(g.state.points, 1);
});
test("prerequisites, costs, permanent builds and project reset", () => {
  const g = newGame();
  g.state.points = 30;
  assert.equal(g.unlock("critical"), false);
  assert(g.unlock("grip"));
  assert.equal(g.unlock("grip"), false);
  assert.equal(g.state.points, 29);
  assert(g.unlock("rhythm"));
  assert(g.unlock("planning"));
  g.run.effects.push({ name: "test", production: 0.5, left: 10 });
  g.add(1000, "manual");
  rewards(g);
  g.state.offers = ["mountain"];
  assert(g.start("mountain"));
  assert.equal(g.run.wallet, 80);
  assert.deepEqual(g.run.effects, []);
  assert.deepEqual(g.run.levels, {});
  assert.deepEqual(g.run.bonuses, []);
  assert.equal(g.rates().tap, 9.375);
  assert(g.state.skills.includes("grip"));
});
test("all projects enforce conditions and objectives without losing a path forward", () => {
  for (const p of projects) {
    const g = new Game();
    g.state.completed = 3;
    g.state.skills = skills.map((s) => s.id);
    g.state.offers = [p.id];
    g.start(p.id);
    assert.equal(g.project.id, p.id);
    assert(g.rates().tap > 0);
    g.add(p.goal, "manual");
    rewards(g);
    if (p.minPumps || p.minUpgrades) assert.notEqual(g.run.mode, "complete");
    g.run.pumps = p.minPumps || 0;
    g.run.levels.handle = p.minUpgrades || 0;
    g.check();
    assert.equal(g.run.mode, "complete");
    assert(g.offers().some((p) => p.difficulty === "Easy"));
  }
});
test("penalties modify rates, expire exactly, and freeze during decisions", () => {
  const g = newGame();
  g.triggerEvent("failure");
  assert(g.chooseEvent(1));
  assert.equal(g.rates().tap, 6);
  g.run.effects[0].left = 0.5;
  g.run.levels.solar = 1;
  g.tick(1);
  assert(Math.abs(g.run.produced - 6.4) < 1e-6);
  assert.equal(g.rates().tap, 10);
  g.triggerEvent("storm");
  const t = g.run.elapsed;
  g.tick(1);
  assert.equal(g.run.elapsed, t);
});
test("events check affordability and skills, risky outcomes and follow-ups", () => {
  const g = newGame();
  g.triggerEvent("failure");
  assert.equal(g.chooseEvent(0), false);
  assert.equal(g.chooseEvent(3), false);
  assert(g.chooseEvent(2));
  assert.equal(g.run.effects[0].production, 1.3);
  g.random = () => 0.99;
  g.triggerEvent("failure");
  g.chooseEvent(2);
  assert.equal(g.run.effects[1].production, 0.4);
  g.triggerEvent("storm");
  g.chooseEvent(1);
  g.run.nextEvent = g.run.elapsed;
  g.tick(0.1);
  assert.equal(g.run.pending.id, "cleanup");
});
test("every event has a free recoverable choice", () => {
  for (const e of events) {
    const g = newGame();
    g.triggerEvent(e.id);
    const i = e.choices.findIndex((c) => !c.cost && !c.skill);
    assert(i >= 0);
    assert(g.chooseEvent(i));
    assert(g.rates().tap > 0);
  }
});
test("save/load roundtrip includes pending decisions, run effects and permanent skills", () => {
  const g = newGame();
  g.state.points = 5;
  g.unlock("grip");
  g.triggerEvent("failure");
  g.chooseEvent(1);
  g.add(260, "manual");
  const data = new Map(),
    storage = {
      setItem: (k, v) => data.set(k, v),
      getItem: (k) => data.get(k),
    };
  assert(save(storage, g.state));
  assert.deepEqual(load(storage).state, g.state);
  assert(validate(JSON.parse(data.get(KEY))));
});
test("malformed saves safely recover; legacy progress migrates", () => {
  for (const raw of [
    "{",
    JSON.stringify({ version: 2 }),
    JSON.stringify({ ...fresh(), run: { project: "missing" } }),
  ]) {
    const s = load({ getItem: () => raw });
    assert.deepEqual(s.state, fresh());
    assert(s.message.includes("could not"));
  }
  const old = load({
    getItem: (key) =>
      key === KEY
        ? null
        : JSON.stringify({ points: 7, permanent: 3, completed: 4 }),
  });
  assert.equal(old.state.legacy, 3);
  assert.equal(old.state.points, 7);
  assert.equal(old.state.completed, 4);
  assert.equal(
    save(
      {
        setItem() {
          throw Error();
        },
      },
      fresh(),
    ),
    false,
  );
});
test("combo remains an active play benefit, idle production is frame-independent", () => {
  const g = newGame();
  for (let i = 0; i < 5; i++) g.pump();
  assert.equal(g.run.produced, 55);
  g.tick(1);
  g.tick(0.3);
  assert.equal(g.run.streak, 0);
  const a = newGame(),
    b = newGame();
  a.run.levels.solar = 1;
  b.run.levels.solar = 1;
  a.tick(1);
  for (let i = 0; i < 10; i++) b.tick(0.1);
  assert(Math.abs(a.run.produced - b.run.produced) < 1e-8);
});
