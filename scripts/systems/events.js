import { events } from "../../data/content.js";

export function triggerEvent(game, id) {
  if (game.blocked) return false;
  const e = events.find((e) => e.id === id);
  if (!e) return false;
  game.run.pending = { type: "event", id };
  game.run.eventCount++;
  return true;
}

export function eventCost(game, choice) {
  return Math.ceil((choice.cost || 0) * game.project.goal);
}

export function chooseEvent(game, index) {
  const r = game.run;
  if (r?.pending?.type !== "event") return false;
  const e = events.find((e) => e.id === r.pending.id),
    c = e.choices[index];
  if (
    !c ||
    r.wallet < game.eventCost(c) ||
    (c.skill && !game.state.skills.includes(c.skill))
  )
    return false;
  r.wallet -= game.eventCost(c);
  let effect = c.effect,
    outcome = c.name;
  if (c.risk) {
    const success =
      game.random() <
      Math.min(
        0.95,
        c.risk + (game.permanent().luck || 0) + (r.levels.filter || 0) * 0.03,
      );
    effect = success ? c.success : c.failure;
    outcome += success ? " — success" : " — failed";
  }
  if (effect) {
    const negative =
      (effect.production || 1) < 1 ||
      (effect.manual || 1) < 1 ||
      (effect.auto || 1) < 1 ||
      (effect.cost || 1) > 1;
    r.effects.push({
      ...effect,
      left:
        effect.duration *
        (negative
          ? game.project.severity * (1 - (game.permanent().resilience || 0))
          : 1),
    });
  }
  if (c.followup) r.followup = c.followup;
  r.log.unshift(`${e.name}: ${outcome}`);
  r.log = r.log.slice(0, 8);
  r.pending = null;
  r.nextEvent = r.elapsed + game.project.eventEvery;
  return true;
}
