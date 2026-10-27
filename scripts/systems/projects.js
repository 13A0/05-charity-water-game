import { projects } from "../../data/content.js";

export function offers(game) {
  if (!game.state.offers.length) {
    const eligible = projects.filter(
      (p) =>
        (!p.unlock || game.state.completed >= p.unlock) &&
        (!p.skill || game.state.skills.includes(p.skill)),
    );
    game.state.offers = ["Easy", "Medium", "Hard"].map((difficulty) => {
      const pool = eligible.filter((p) => p.difficulty === difficulty);
      return pool[Math.floor(game.random() * pool.length)].id;
    });
  }
  return game.state.offers.map((id) => projects.find((p) => p.id === id));
}

export function start(game, id) {
  if (game.run && game.run.mode !== "complete") return false;
  if (!game.offers().some((p) => p.id === id)) return false;
  const p = projects.find((p) => p.id === id);
  game.state.run = {
    project: id,
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
  game.state.history.unshift({
    project: r.project,
    time: r.elapsed,
    water: r.produced,
    kp: r.reward,
  });
  game.state.history = game.state.history.slice(0, 30);
  r.pending = { type: "complete" };
  r.effects = [];
}
