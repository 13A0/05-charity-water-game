import { skills, rewards } from "../../data/content.js";

export function permanent(game) {
  const result = {};
  for (const s of skills.filter((s) => game.state.skills.includes(s.id)))
    for (const [k, v] of Object.entries(s.effect))
      result[k] = (result[k] || 0) + v;
  return result;
}

export function unlock(game, id) {
  const s = skills.find((s) => s.id === id);
  if (
    !s ||
    game.state.skills.includes(id) ||
    game.state.points < s.cost ||
    !s.requires.every((id) => game.state.skills.includes(id))
  )
    return false;
  game.state.points -= s.cost;
  game.state.skills.push(id);
  return true;
}

export function check(game) {
  const r = game.run;
  for (const n of [25, 50, 75])
    if (
      r.produced >= (game.project.goal * n) / 100 &&
      !r.milestones.includes(n)
    ) {
      r.milestones.push(n);
      r.queue.push(n);
    }
  if (!r.pending && r.queue.length) {
    const n = r.queue.shift();
    const ids = rewards.map((x) => x.id);
    for (let i = ids.length - 1; i > 0; i--) {
      const j = Math.floor(game.random() * (i + 1));
      [ids[i], ids[j]] = [ids[j], ids[i]];
    }
    r.pending = { type: "milestone", percent: n, choices: ids.slice(0, 3) };
  }
  if (!r.pending && r.produced >= game.project.goal && game.objectiveMet())
    game.complete();
}

export function chooseReward(game, id) {
  const r = game.run;
  if (r?.pending?.type !== "milestone" || !r.pending.choices.includes(id))
    return false;
  r.bonuses.push(id);
  r.wallet += rewards.find((x) => x.id === id).effect.wallet || 0;
  r.pending = null;
  game.check();
  return true;
}
