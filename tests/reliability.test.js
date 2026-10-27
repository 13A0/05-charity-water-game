import test from "node:test";
import assert from "node:assert/strict";
import { Game } from "../scripts/engine.js";
import { validate, createSaveWriter } from "../scripts/save.js";
import { projectArchetypes } from "../data/project-archetypes.js";
import {
  projectConditions,
  projectObjectives,
} from "../data/project-generation.js";
import { buildProject } from "../scripts/systems/project-generator.js";
const setup = () => {
  const g = new Game(undefined, () => 0.1);
  g.state.offers = ["village"];
  g.start("village");
  return g;
};

test("hybrid streak expiration produces the same water across different frame sizes", () => {
  const a = setup(),
    b = setup();
  for (const g of [a, b]) {
    g.state.skills = ["engineer", "salvage", "hybrid"];
    g.run.levels.solar = 1;
    g.run.elapsed = 1.15;
    g.run.lastTap = 0;
    g.run.streak = 5;
  }
  a.tick(1);
  for (let i = 0; i < 10; i++) b.tick(0.1);
  assert(Math.abs(a.run.produced - 10.25) < 1e-8);
  assert(Math.abs(a.run.produced - b.run.produced) < 1e-8);
  assert.equal(a.run.streak, 0);
});

test("events interrupt exactly at their scheduled time without an extra production step", () => {
  const g = setup();
  g.run.levels.solar = 1;
  g.run.nextEvent = 0.035;
  g.tick(1);
  assert.equal(g.run.elapsed, 0.035);
  assert(Math.abs(g.run.produced - 0.28) < 1e-8);
  assert.equal(g.run.pending.type, "event");
  g.tick(1);
  assert.equal(g.run.elapsed, 0.035);
  assert.equal(g.chooseEvent("__proto__"), false);
});

test("invalid milestone queues and duplicate choices cannot survive save validation", () => {
  const g = setup();
  g.add(800, "manual");
  for (const mutate of [
    (s) => (s.run.levels = []),
    (s) => (s.run.queue = [50, 50]),
    (s) => (s.run.queue = []),
    (s) => s.run.pending.choices.fill("hands"),
    (s) => (s.run.streak = 5.5),
  ]) {
    const state = structuredClone(g.state);
    mutate(state);
    assert.throws(() => validate(state));
  }
  assert(validate(g.state));
});

test("new generated locations save correctly without entries in frozen legacy templates", () => {
  const template = { ...projectArchetypes[0], id: "test-location" };
  projectArchetypes.push(template);
  try {
    const p = buildProject(template, 0, 0, projectObjectives[0], [
      projectConditions[0],
    ]);
    const g = new Game();
    g.state.offers = [p];
    g.start(p.id);
    assert(validate(JSON.parse(JSON.stringify(g.state))));
  } finally {
    projectArchetypes.pop();
  }
});

test("unchanged saves avoid storage writes; failed writes are retried", () => {
  let writes = 0,
    fail = false;
  const write = createSaveWriter({
    setItem() {
      writes++;
      if (fail) throw Error("Storage full");
    },
  });
  const state = { value: 1 };
  assert(write(state));
  assert(write(state));
  assert.equal(writes, 1);
  state.value = 2;
  fail = true;
  assert.equal(write(state), false);
  assert.equal(write(state), false);
  assert.equal(writes, 3);
  fail = false;
  assert(write(state));
  assert(write(state));
  assert.equal(writes, 4);
});
