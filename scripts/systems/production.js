import { upgrades, rewards } from "../../data/content.js";

export function rates(game) {
  const r = game.run;
  if (!r) return { tap: 0, auto: 0 };
  const p = game.project,
    k = game.permanent(),
    b = { tap: 10 + game.state.legacy * 2, auto: 0, power: 1, synergy: 0 };
  for (const u of upgrades)
    for (const [key, val] of Object.entries(u.effect))
      b[key] = (b[key] || 0) + val * (r.levels[u.id] || 0);
  for (const id of r.bonuses)
    for (const [key, val] of Object.entries(
      rewards.find((x) => x.id === id).effect,
    ))
      if (key !== "wallet") b[key] = (b[key] || 0) + val;
  let tap =
      b.tap *
      b.power *
      (1 + (k.manual || 0)) *
      (p.manual < 1 && k.access ? 1 - (1 - p.manual) / 2 : p.manual),
    auto =
      b.auto *
      b.power *
      (1 + (k.automation || 0)) *
      (1 + b.synergy * (r.levels.solar || 0)) *
      p.auto;
  if (r.streak >= 5) auto *= 1 + (k.hybrid || 0);
  for (const e of r.effects) {
    tap *= (e.production ?? 1) * (e.manual ?? 1);
    auto *= (e.production ?? 1) * (e.auto ?? 1);
  }
  return { tap, auto };
}

export function cost(game, id) {
  const u = upgrades.find((u) => u.id === id);
  if (!u || !game.run) return Infinity;
  return Math.ceil(
    u.cost *
      u.growth ** (game.run.levels[id] || 0) *
      game.project.cost *
      (1 - (game.permanent().discount || 0)) *
      game.run.effects.reduce((a, e) => a * (e.cost || 1), 1),
  );
}
