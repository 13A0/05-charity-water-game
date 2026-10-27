import {
  projects as projectDefinitions,
  events as eventDefinitions,
} from "../data/content.js";
import * as production from "./systems/production.js";
import * as progression from "./systems/progression.js";
import * as projects from "./systems/projects.js";
import * as events from "./systems/events.js";
const regularEvents = eventDefinitions.filter((event) => !event.followupOnly);
const EPSILON = 1e-8;
const STREAK_SECONDS = 1.2;
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
    const price = this.cost(id);
    if (this.blocked || this.run.wallet < price) return false;
    this.run.wallet -= price;
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
    r.streak =
      r.elapsed - r.lastTap <= STREAK_SECONDS ? Math.min(5, r.streak + 1) : 1;
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

  queueDueEvent() {
    if (this.blocked || this.run.elapsed + EPSILON < this.run.nextEvent)
      return false;
    const run = this.run;
    const id =
      run.followup ||
      regularEvents[Math.floor(this.random() * regularEvents.length)].id;
    run.followup = null;
    return this.triggerEvent(id);
  }

  tick(dt) {
    if (this.blocked || !Number.isFinite(dt) || dt <= 0) return;
    let remaining = Math.min(dt, 1);
    while (remaining > EPSILON && !this.blocked) {
      if (this.queueDueEvent()) break;
      const run = this.run;
      const streakLeft = run.lastTap + STREAK_SECONDS - run.elapsed;
      if (streakLeft <= EPSILON) run.streak = 0;
      // Integrate only to the next state change, so frame size cannot extend bonuses.
      let step = Math.min(remaining, 0.1, run.nextEvent - run.elapsed);
      if (run.streak > 0) step = Math.min(step, streakLeft);
      for (const effect of run.effects)
        if (effect.left > EPSILON) step = Math.min(step, effect.left);
      if (run.effects.some((effect) => effect.left <= EPSILON))
        run.effects = run.effects.filter((effect) => effect.left > EPSILON);
      const rate = this.rates().auto;
      run.elapsed += step;
      for (const effect of run.effects) effect.left -= step;
      if (run.effects.some((effect) => effect.left <= EPSILON))
        run.effects = run.effects.filter((effect) => effect.left > EPSILON);
      if (run.elapsed - run.lastTap >= STREAK_SECONDS - EPSILON) run.streak = 0;
      this.add(rate * step, "auto");
      remaining -= step;
      this.queueDueEvent();
    }
  }
  complete() {
    return projects.complete(this);
  }
}
