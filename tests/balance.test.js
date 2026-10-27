import test from "node:test";
import assert from "node:assert/strict";
import { Game } from "../scripts/engine.js";
import { projects, upgrades, events } from "../data/content.js";

test("every project has a viable baseline route without permanent production bonuses", () => {
  for (const project of projects) {
    const game = new Game(undefined, () => 0.4);
    // Offer fixtures let us exercise even later content with a baseline build.
    game.state.offers = [project.id];
    game.start(project.id);
    for (let step = 0; step < 2400 && game.run.mode !== "complete"; step++) {
      const pending = game.run.pending;
      if (pending?.type === "milestone") game.chooseReward(pending.choices[0]);
      else if (pending?.type === "event") {
        const event = events.find((e) => e.id === pending.id);
        game.chooseEvent(event.choices.findIndex((c) => !c.cost && !c.skill));
      } else {
        if (step % 2 === 0) game.pump();
        const cheapest = [...upgrades].sort(
          (a, b) => game.cost(a.id) - game.cost(b.id),
        )[0];
        game.buy(cheapest.id);
        game.tick(0.25);
      }
    }
    assert.equal(game.run.mode, "complete", project.id);
    assert(game.run.elapsed < 600, `${project.id} stalled`);
    console.log(
      `${project.name}: ${Math.round(game.run.elapsed)}s active time, ${game.run.pumps} manual pumps, ${game.run.eventCount} events`,
    );
  }
});
