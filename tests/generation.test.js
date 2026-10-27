import test from "node:test";
import assert from "node:assert/strict";
import { Game, fresh } from "../scripts/engine.js";
import { load, KEY, validate } from "../scripts/save.js";
import {
  signature,
  validateGenerated,
} from "../scripts/systems/project-generator.js";
import {
  projectConditions,
  projectObjectives,
} from "../data/project-generation.js";
import { upgrades, events } from "../data/content.js";
const rng = (seed) => () =>
  (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
function complete(g) {
  g.run.pumps = g.project.minPumps;
  g.run.levels.handle = g.project.minUpgrades;
  g.add(g.project.goal, "manual");
  while (g.run.pending?.type === "milestone")
    g.chooseReward(g.run.pending.choices[0]);
  assert.equal(g.run.mode, "complete");
}

test("100 completions strictly increase every tier target; offers are fresh and unique", () => {
  const g = new Game(fresh(), rng(71));
  let prior = [0, 0, 0];
  for (let stage = 0; stage < 100; stage++) {
    const recent = [...g.state.recentProjects],
      offers = g.offers();
    assert.equal(offers.length, 3);
    assert.equal(new Set(offers.map((p) => p.id)).size, 3);
    assert.equal(new Set(offers.map((p) => p.templateId)).size, 3);
    offers.forEach((p, i) => {
      assert.equal(p.stage, stage);
      assert(p.goal > prior[i]);
      if (stage > 0) assert(p.goal / prior[i] < 1.16);
      assert(!recent.includes(signature(p)));
      assert(validateGenerated(p));
      prior[i] = p.goal;
    });
    assert.deepEqual(g.offers(), offers);
    g.start(offers[stage % 3].id);
    complete(g);
  }
});

test("independent objectives and conditions vary for the same location", () => {
  const g = new Game(fresh(), rng(13)),
    seen = new Map();
  for (let stage = 0; stage < 25; stage++) {
    g.state.completed = stage;
    g.state.offers = [];
    for (const p of g.offers()) {
      if (!seen.has(p.templateId))
        seen.set(p.templateId, {
          objectives: new Set(),
          conditions: new Set(),
        });
      seen.get(p.templateId).objectives.add(p.objectiveId);
      seen.get(p.templateId).conditions.add(p.conditionIds.join("+"));
    }
  }
  for (const entry of seen.values()) {
    assert(entry.objectives.size >= 3);
    assert(entry.conditions.size >= 4);
  }
});

test("condition budgets and objective unlocks stay appropriate at every tested stage", () => {
  for (const seed of [1, 2, 999]) {
    const g = new Game(fresh(), rng(seed));
    for (let stage = 0; stage < 40; stage++) {
      g.state.completed = stage;
      g.state.offers = [];
      g.offers().forEach((p) => {
        const level = stage + p.tierIndex * 2,
          budget = Math.min(
            4,
            Math.max(1, Math.floor(stage / 3) + p.tierIndex),
          );
        const conditions = p.conditionIds.map((id) =>
          projectConditions.find((c) => c.id === id),
        );
        assert(conditions.every((c) => c.minLevel <= level));
        assert(conditions.reduce((n, c) => n + c.weight, 0) <= budget);
        assert(
          projectObjectives.find((o) => o.id === p.objectiveId).minLevel <=
            level,
        );
        assert(
          p.manual >= 0.7 &&
            p.auto >= 0.65 &&
            p.cost <= 1.35 &&
            p.eventEvery >= 20 &&
            p.severity <= 1.65,
        );
        if (stage < 6 || p.tierIndex === 0) assert.equal(conditions.length, 1);
        assert(p.minPumps <= 200 && p.minUpgrades <= 12);
      });
    }
  }
});

test("save/load preserves exact offers and restarts preserve the selected recipe", () => {
  const g = new Game(fresh(), rng(9));
  g.state.completed = 8;
  const offered = structuredClone(g.offers());
  const restored = load({
    getItem: (k) => (k === KEY ? JSON.stringify(g.state) : null),
  });
  assert.deepEqual(restored.state.offers, offered);
  const resumed = new Game(restored.state, () => 0.99);
  assert.deepEqual(resumed.offers(), offered);
  assert(resumed.start(offered[1].id));
  resumed.run.wallet = 900;
  resumed.run.levels.solar = 3;
  const selected = structuredClone(resumed.project);
  assert(resumed.restart());
  assert.deepEqual(resumed.project, selected);
  assert.equal(resumed.run.wallet, 0);
  assert.deepEqual(resumed.run.levels, {});
  assert.equal(resumed.state.completed, 8);
  assert(validate(JSON.parse(JSON.stringify(resumed.state))));
});

test("old active saves retain original requirements; corrupt recipes recover safely", () => {
  const old = fresh();
  delete old.recentProjects;
  old.offers = ["mountain"];
  const g = new Game(old);
  g.start("mountain");
  delete g.run.projectSnapshot;
  const restored = load({
    getItem: (k) => (k === KEY ? JSON.stringify(g.state) : null),
  });
  const resumed = new Game(restored.state);
  assert.equal(resumed.project.goal, 3000);
  assert.equal(resumed.project.manual, 0.75);
  assert.deepEqual(resumed.state.recentProjects, []);
  const generated = new Game();
  generated.offers();
  generated.state.offers[0].manual = 0;
  const invalid = load({
    getItem: (k) => (k === KEY ? JSON.stringify(generated.state) : null),
  });
  assert.equal(invalid.state.run, null);
  assert(invalid.message.includes("could not"));
});

test("all sampled generated projects can finish with baseline equipment and free event choices", () => {
  let slowest = 0;
  for (const stage of [0, 1, 4, 6, 12, 25])
    for (let lane = 0; lane < 3; lane++) {
      const g = new Game(fresh(), rng(stage * 13 + lane + 1));
      g.state.completed = stage;
      const p = g.offers()[lane];
      g.start(p.id);
      for (let step = 0; step < 4800 && g.run.mode !== "complete"; step++) {
        const pending = g.run.pending;
        if (pending?.type === "milestone") g.chooseReward(pending.choices[0]);
        else if (pending?.type === "event") {
          const e = events.find((e) => e.id === pending.id);
          g.chooseEvent(e.choices.findIndex((c) => !c.cost && !c.skill));
        } else {
          if (step % 2 === 0) g.pump();
          const cheapest = [...upgrades].sort(
            (a, b) => g.cost(a.id) - g.cost(b.id),
          )[0];
          g.buy(cheapest.id);
          g.tick(0.25);
        }
      }
      assert.equal(g.run.mode, "complete", p.id);
      slowest = Math.max(slowest, g.run.elapsed);
    }
  console.log(
    `18 generated-project simulations completed; slowest ${Math.round(slowest)}s of active play.`,
  );
});
