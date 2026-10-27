import { generateOffers } from "./project-generator.js";
import { projects } from "../../data/content.js";

export function offers(game) {
  if (!game.state.offers.length)
    game.state.offers = generateOffers(game.state, game.random);
  return game.state.offers.map((p) =>
    typeof p === "string" ? projects.find((t) => t.id === p) : p,
  );
}

export function start(game, id) {
  if (game.run && game.run.mode !== "complete") return false;
  const p = game.offers().find((p) => p.id === id);
  if (!p) return false;
  game.state.run = {
    project: p.templateId || p.id,
    projectSnapshot: structuredClone(p),
    mode: "running",
    wallet: game.permanent().starting || 0,
    produced: 0,
    elapsed: 0,
    levels: {},
    bonuses: [],
    effects: [],
    milestones: [],
    queue: [],
    pending: null,
    streak: 0,
    lastTap: -2,
    pumps: 0,
    manualWater: 0,
    autoWater: 0,
    eventCount: 0,
    nextEvent: p.eventEvery,
    followup: null,
    log: [],
    reward: 0,
  };
  game.state.offers = [];
  return true;
}

export function objectiveMet(game) {
  return (
    game.run.pumps >= (game.project.minPumps || 0) &&
    Object.values(game.run.levels).reduce((a, b) => a + b, 0) >=
      (game.project.minUpgrades || 0)
  );
}

export function complete(game) {
  const r = game.run;
  if (r.mode === "complete") return;
  r.mode = "complete";
  r.reward = game.project.kp + (game.permanent().kp || 0);
  game.state.points += r.reward;
  game.state.completed++;
  game.state.offers = [];
  game.state.history.unshift({
    project: r.project,
    expedition: game.project.id,
    time: r.elapsed,
    water: r.produced,
    kp: r.reward,
  });
  game.state.history = game.state.history.slice(0, 30);
  r.pending = { type: "complete" };
  r.effects = [];
}
