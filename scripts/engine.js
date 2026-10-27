import {
  projects as projectDefinitions,
  events as eventDefinitions,
} from "../data/content.js";
import * as production from "./systems/production.js";
import * as progression from "./systems/progression.js";
import * as projects from "./systems/projects.js";
import * as events from "./systems/events.js";
export const fresh = () => ({
  version: 2,
  points: 0,
  completed: 0,
  legacy: 0,
  skills: [],
  history: [],
  run: null,
  offers: [],
  recentProjects: [],
});
export class Game {
  constructor(state = fresh(), random = Math.random) {
    this.state = state;
    this.random = random;
  }
  get run() {
    return this.state.run;
  }
  get project() {
    return (
      this.run?.projectSnapshot ||
      projectDefinitions.find((p) => p.id === this.run?.project)
    );
  }
  permanent() {
    return progression.permanent(this);
  }

  offers() {
    return projects.offers(this);
  }

  restart() {
    if (!this.run || this.run.mode === "complete" || this.run.pending)
      return false;
    const snapshot = structuredClone(this.project);
    const id = snapshot.id;
    this.state.run = null;
    this.state.offers = [snapshot];
    return this.start(id);
  }

  start(id) {
    return projects.start(this, id);
  }

  get blocked() {
    return !this.run || this.run.mode !== "running" || !!this.run.pending;
  }
  rates() {
    return production.rates(this);
  }

  cost(id) {
    return production.cost(this, id);
  }

  buy(id) {
    if (this.blocked || this.run.wallet < this.cost(id)) return false;
    this.run.wallet -= this.cost(id);
    this.run.levels[id] = (this.run.levels[id] || 0) + 1;
    this.check();
    return true;
  }
  unlock(id) {
    return progression.unlock(this, id);
  }

  pump() {
    if (this.blocked) return null;
    const r = this.run;
    r.streak = r.elapsed - r.lastTap <= 1.2 ? Math.min(5, r.streak + 1) : 1;
    r.lastTap = r.elapsed;
    r.pumps++;
    const crit = this.random() < (this.permanent().crit || 0);
    const amount =
      this.rates().tap *
      (r.streak >= 5 ? 1.5 + (this.permanent().combo || 0) : 1) *
      (crit ? 3 : 1);
    this.add(amount, "manual");
    return { amount, crit };
  }
  add(amount, source) {
    const r = this.run;
    if (this.blocked || !Number.isFinite(amount) || amount <= 0) return;
    r.wallet += amount;
    r.produced += amount;
    r[source === "manual" ? "manualWater" : "autoWater"] += amount;
    this.check();
  }
  check() {
    return progression.check(this);
  }

  objectiveMet() {
    return projects.objectiveMet(this);
  }

  chooseReward(id) {
    return progression.chooseReward(this, id);
  }

  triggerEvent(id) {
    return events.triggerEvent(this, id);
  }

  eventCost(choice) {
    return events.eventCost(this, choice);
  }

  chooseEvent(index) {
    return events.chooseEvent(this, index);
  }

  tick(dt) {
    if (this.blocked || !Number.isFinite(dt) || dt <= 0) return;
    let remaining = Math.min(dt, 1);
    while (remaining > 1e-8 && !this.blocked) {
      const r = this.run,
        step = Math.min(
          remaining,
          0.1,
          ...r.effects.map((e) => Math.max(0.00001, e.left)),
        );
      const rate = this.rates().auto;
      r.elapsed += step;
      if (r.elapsed - r.lastTap > 1.2) r.streak = 0;
      r.effects = r.effects
        .map((e) => ({ ...e, left: e.left - step }))
        .filter((e) => e.left > 1e-8);
      this.add(rate * step, "auto");
      remaining -= step;
      if (!this.blocked && r.elapsed >= r.nextEvent) {
        const pool = eventDefinitions.filter((e) => !e.followupOnly);
        const id =
          r.followup || pool[Math.floor(this.random() * pool.length)].id;
        r.followup = null;
        this.triggerEvent(id);
      }
    }
  }
  complete() {
    return projects.complete(this);
  }
}
