import { fresh } from "./engine.js";
import {
  skills,
  projects,
  upgrades,
  rewards,
  events,
} from "../data/content.js";
export const KEY = "pump-it-v2";
const nonnegative = (n) => Number.isFinite(n) && n >= 0 && n <= 1e12;
const int = (n) => nonnegative(n) && Number.isSafeInteger(n);
export function validate(s) {
  if (
    !s ||
    s.version !== 2 ||
    !int(s.points) ||
    !int(s.completed) ||
    !int(s.legacy) ||
    !Array.isArray(s.skills) ||
    new Set(s.skills).size !== s.skills.length ||
    !s.skills.every((id) =>
      skills.some(
        (k) => k.id === id && k.requires.every((r) => s.skills.includes(r)),
      ),
    )
  )
    throw Error("Invalid progression");
  if (
    !Array.isArray(s.offers) ||
    !s.offers.every((id) => projects.some((p) => p.id === id)) ||
    !Array.isArray(s.history)
  )
    throw Error("Invalid project list");
  const r = s.run;
  if (r) {
    if (
      !projects.some((p) => p.id === r.project) ||
      !["running", "paused", "complete"].includes(r.mode)
    )
      throw Error("Invalid project");
    for (const k of [
      "wallet",
      "produced",
      "elapsed",
      "pumps",
      "manualWater",
      "autoWater",
      "eventCount",
      "nextEvent",
      "reward",
      "streak",
    ])
      if (!nonnegative(r[k])) throw Error("Invalid run counter");
    if (!Number.isFinite(r.lastTap)) throw Error("Invalid tap");
    if (
      !r.levels ||
      !Object.entries(r.levels).every(
        ([k, v]) => upgrades.some((u) => u.id === k) && int(v) && v <= 100,
      )
    )
      throw Error("Invalid upgrades");
    if (
      !Array.isArray(r.bonuses) ||
      r.bonuses.length > 3 ||
      !r.bonuses.every((id) => rewards.some((b) => b.id === id))
    )
      throw Error("Invalid rewards");
    if (
      !Array.isArray(r.milestones) ||
      new Set(r.milestones).size !== r.milestones.length ||
      !r.milestones.every((n) => [25, 50, 75].includes(n)) ||
      !Array.isArray(r.queue) ||
      !r.queue.every((n) => r.milestones.includes(n))
    )
      throw Error("Invalid milestones");
    if (
      !Array.isArray(r.effects) ||
      r.effects.length > 30 ||
      !r.effects.every(
        (e) =>
          typeof e.name === "string" &&
          nonnegative(e.left) &&
          e.left <= 300 &&
          ["production", "auto", "manual", "cost"].every(
            (k) =>
              e[k] === undefined ||
              (Number.isFinite(e[k]) && e[k] > 0 && e[k] <= 10),
          ),
      )
    )
      throw Error("Invalid effects");
    if (
      !Array.isArray(r.log) ||
      !r.log.every((x) => typeof x === "string") ||
      (r.followup && !events.some((e) => e.id === r.followup))
    )
      throw Error("Invalid event history");
    if (r.pending) {
      const p = r.pending;
      if (p.type === "milestone") {
        if (
          !r.milestones.includes(p.percent) ||
          !Array.isArray(p.choices) ||
          p.choices.length !== 3 ||
          !p.choices.every((id) => rewards.some((b) => b.id === id))
        )
          throw Error("Invalid choice");
      } else if (p.type === "event") {
        if (!events.some((e) => e.id === p.id)) throw Error("Invalid event");
      } else if (p.type !== "complete" || r.mode !== "complete")
        throw Error("Invalid dialog");
    }
  }
  return s;
}
export function load(storage) {
  try {
    const raw = storage.getItem(KEY);
    if (raw)
      return {
        state: validate(JSON.parse(raw)),
        message: "Expedition restored.",
      };
    const old = JSON.parse(storage.getItem("pump-it-progress") || "null"),
      s = fresh();
    if (old) {
      s.points = int(old.points) ? old.points : 0;
      s.completed = int(old.completed) ? old.completed : 0;
      s.legacy = int(old.permanent) ? old.permanent : 0;
    }
    return {
      state: s,
      message: old
        ? "Original knowledge and permanent boosts imported."
        : "Your first drop is the beginning.",
    };
  } catch {
    return {
      state: fresh(),
      message: "Saved data could not be read. A fresh expedition is ready.",
    };
  }
}
export function save(storage, state) {
  try {
    storage.setItem(KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}
