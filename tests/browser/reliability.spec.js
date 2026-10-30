import { test, expect } from "@playwright/test";
import { Game } from "../../scripts/engine.js";

test("storage access failures leave the game playable with an honest save status", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() => {
    Object.defineProperty(window, "localStorage", {
      get() {
        throw new DOMException("Storage blocked", "SecurityError");
      },
    });
  });
  await page.goto("/");
  await page.locator(".choice").first().click();
  await page.getByRole("button", { name: /^Confirm:/ }).click();
  await page.locator("#pump").click();
  await expect(page.locator("#produced")).toHaveText("10");
  await expect(page.locator("#save-status")).toHaveText(
    "Saving unavailable — keep this tab open",
  );
  expect(errors).toEqual([]);
});

test("hiding a tab pauses automation and returning does not award offline water", async ({
  page,
}) => {
  const game = new Game();
  game.state.offers = ["village"];
  game.start("village");
  game.run.levels.solar = 1;
  await page.addInitScript(
    (state) => localStorage.setItem("pump-it-v2", JSON.stringify(state)),
    game.state,
  );
  await page.clock.install();
  await page.goto("/");
  await page.locator("#pause").click();
  await page.clock.runFor(1000);
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  const water = await page.locator("#produced").textContent();
  await expect(page.locator("#pause")).toHaveText("Resume →");
  // Background tabs suspend frames; jump time without replaying every frame.
  await page.clock.fastForward(60000);
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: false,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.clock.runFor(1000);
  await expect(page.locator("#produced")).toHaveText(water);
  await expect(page.locator("#pause")).toHaveText("Resume →");
  await page.locator("#pause").click();
  await page.clock.runFor(1000);
  expect(Number(await page.locator("#produced").textContent())).toBeGreaterThan(
    Number(water),
  );
});

test("reduced motion cancels an existing sprite animation and restores its idle frame", async ({
  page,
}) => {
  await page.goto("/");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.clock.install();
  await page.evaluate(async () => {
    const { AssetManager } = await import("/scripts/assets.js");
    window.testArt = new AssetManager();
    const sprite = document.querySelector("#pump-sprite");
    window.testArt.animate(sprite, "pump");
  });
  await page.clock.runFor(70);
  await expect(page.locator("#pump-sprite")).toHaveCSS(
    "background-image",
    /pump-1.svg/,
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.evaluate(() =>
    window.testArt.animate(document.querySelector("#pump-sprite"), "pump"),
  );
  await page.clock.runFor(70);
  await expect(page.locator("#pump-sprite")).toHaveCSS(
    "background-image",
    /pump-0.svg/,
  );
});

test("turning sound off pauses every active cue", async ({ page }) => {
  await page.goto("/");
  await page.locator(".choice").first().click();
  const result = await page.evaluate(async () => {
    const { AudioManager } = await import("/scripts/assets.js");
    const audio = new AudioManager();
    audio.toggle();
    await Promise.all(Object.values(audio.clips).map((clip) => clip.play()));
    const playing = Object.values(audio.clips).some((clip) => !clip.paused);
    audio.toggle();
    return {
      playing,
      enabled: audio.enabled,
      paused: Object.values(audio.clips).every((clip) => clip.paused),
    };
  });
  expect(result).toEqual({ playing: true, enabled: false, paused: true });
});
