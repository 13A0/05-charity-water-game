import { Game } from "../../scripts/engine.js";
import { test, expect } from "@playwright/test";
// Physical clicks do not wait on a pump that an automatic milestone just disabled.
async function pumpClick(page) {
  await page.locator("#pump").scrollIntoViewIfNeeded();
  const box = await page.locator("#pump").boundingBox();
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
}
async function choose(page, index = 0) {
  await page.locator(".choice").nth(index).click();
  await page.getByRole("button", { name: /^Confirm:/ }).click();
}
async function start(page) {
  await page.goto("/");
  await choose(page);
  await expect(page.locator("#dialog")).not.toBeVisible();
}
test("desktop: project choice, pumping, shop, all milestones, completion and permanent progression", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await start(page);
  await page.screenshot({ path: "test-results/desktop.png", fullPage: true });
  for (let i = 0; i < 7; i++) await pumpClick(page);
  const contributed = await page.locator("#produced").textContent();
  await page.locator("#upgrade-handle").click();
  await expect(page.locator("#produced")).toHaveText(contributed);
  for (let milestone = 0; milestone < 3; milestone++) {
    for (let i = 0; i < 100; i++) {
      if (await page.locator("#dialog").isVisible()) break;
      await pumpClick(page);
    }
    await expect(page.locator("#dialog")).toBeVisible();
    await expect(page.locator(".dialog-body h2")).toHaveText(
      "A little extra momentum.",
    );
    await choose(page);
  }
  for (let i = 0; i < 150; i++) {
    if (await page.locator("#dialog").isVisible()) break;
    await pumpClick(page);
  }
  await expect(page.locator(".dialog-body h2")).toHaveText(
    "A community. A new beginning.",
  );
  await expect(page.locator("#kp")).toHaveText("1");
  await page.getByRole("button", { name: "Explore permanent skills" }).click();
  await page.getByRole("button", { name: /^Firm grip/ }).click();
  await choose(page);
  await expect(page.locator("#kp")).toHaveText("0");
  await page
    .getByRole("button", { name: "Back to expedition planning" })
    .click();
  await page.getByRole("button", { name: "Choose next expedition →" }).click();
  await choose(page, 1);
  await expect(page.locator("#difficulty")).toContainText("Expedition 2");
  const title = await page.locator("#project-title").textContent();
  const rate = await page.locator("#manual-rate").textContent();
  await expect(page.locator("#goal")).toHaveText("3,425");
  await expect(page.locator("#produced")).toHaveText("0");
  await page.reload();
  await expect(page.locator("#project-title")).toHaveText(title);
  await expect(page.locator("#manual-rate")).toHaveText(rate);
  await expect(page.locator("#pause")).toHaveText("Resume →");
  expect(errors).toEqual([]);
});
test("rapid input cannot accept a decision and selection needs a distinct confirmation", async ({
  page,
}) => {
  await start(page);
  for (let i = 0; i < 21; i++) {
    if (await page.locator("#dialog").isVisible()) break;
    await pumpClick(page);
  }
  while (!(await page.locator("#dialog").isVisible())) await pumpClick(page);
  const button = page.locator(".choice").first(),
    box = await button.boundingBox();
  for (let i = 0; i < 15; i++) await page.mouse.click(box.x + 30, box.y + 30);
  await expect(
    page.getByRole("button", { name: "Select an option first" }),
  ).toBeDisabled();
  await expect(page.locator("#dialog")).toBeVisible();
  await button.click();
  expect(
    await page.getByRole("button", { name: /^Confirm:/ }).isEnabled(),
  ).toBe(true);
  await page.getByRole("button", { name: /^Confirm:/ }).click();
  await expect(page.locator("#dialog")).not.toBeVisible();
});
test("choices can switch and confirm immediately after the opening guard", async ({
  page,
}) => {
  await page.clock.install();
  await page.goto("/");
  const choices = page.locator(".choice");
  await expect(choices.first()).toBeEnabled();
  // Freeze time so action auto-waiting cannot hide a restarted guard.
  await page.clock.pauseAt(new Date(Date.now() + 1000));
  for (const index of [0, 1, 2, 0]) {
    await choices.nth(index).click();
    expect(await choices.nth(index).getAttribute("aria-pressed")).toBe("true");
    expect(await page.locator(".choice:disabled").count()).toBe(0);
    expect(
      await page.getByRole("button", { name: /^Confirm:/ }).isEnabled(),
    ).toBe(true);
  }
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  await choices.nth(1).focus();
  await page.keyboard.press("Enter");
  expect(await choices.nth(1).getAttribute("aria-pressed")).toBe("true");
  const confirm = page.getByRole("button", { name: /^Confirm:/ });
  expect(await confirm.isEnabled()).toBe(true);
  await confirm.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#dialog")).not.toBeVisible();
});

test("mobile layout, touch input, field guide, skill navigation and pause", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  await page.goto("/");
  await expect(page.locator(".choice").first()).toBeEnabled();
  await page.locator(".choice").first().tap();
  await expect(page.getByRole("button", { name: /^Confirm:/ })).toBeEnabled();
  await page.getByRole("button", { name: /^Confirm:/ }).tap();
  await page.locator("#pump").tap();
  await expect(page.locator("#produced")).toHaveText("10");
  await page.screenshot({ path: "test-results/mobile.png", fullPage: true });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.locator("#skills").tap();
  await page.screenshot({
    path: "test-results/mobile-skills.png",
    fullPage: true,
  });
  expect(
    await page
      .locator(".dialog-body")
      .evaluate((e) => e.scrollWidth <= e.clientWidth),
  ).toBe(true);
  await page.getByRole("button", { name: "Return to expedition" }).tap();
  await page.locator("#help").tap();
  await page.getByRole("button", { name: "Back to the field" }).tap();
  await page.locator("#pause").tap();
  await expect(page.locator("#pause")).toHaveText("Resume →");
  await context.close();
});
test("keyboard selection is explicit; held keys cannot repeat rewards", async ({
  page,
}) => {
  await page.goto("/");
  const choice = page.locator(".choice").first();
  await expect(choice).toBeEnabled();
  await choice.focus();
  await page.keyboard.press("Enter");
  const confirm = page.getByRole("button", { name: /^Confirm:/ });
  await expect(confirm).toBeEnabled();
  await confirm.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#dialog")).not.toBeVisible();
  await page.locator("#pump").focus();
  await page.keyboard.down("Space");
  await page.keyboard.down("Space");
  await expect(page.locator("#produced")).toHaveText("0");
  await page.keyboard.up("Space");
  await expect(page.locator("#produced")).toHaveText("10");
});

test("event decisions apply real effects, restore from saves and restart safely", async ({
  page,
}) => {
  const g = new Game();
  g.state.offers = ["village"];
  g.start("village");
  g.triggerEvent("failure");
  await page.addInitScript((state) => {
    if (!sessionStorage.getItem("seeded")) {
      localStorage.setItem("pump-it-v2", JSON.stringify(state));
      sessionStorage.setItem("seeded", "yes");
    }
  }, g.state);
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: /Emergency repair/ }),
  ).toBeDisabled();
  await choose(page, 1);
  await expect(page.locator("#effects")).toContainText(
    "−40%".replace("−", "-"),
  );
  await expect(page.locator("#manual-rate")).toHaveText("6 L / pump");
  await page.reload();
  await expect(page.locator("#effects")).toContainText("Temporary pipework");
  await page.locator("#restart").click();
  await choose(page);
  await expect(page.locator("#effects")).toBeEmpty();
  await expect(page.locator("#manual-rate")).toHaveText("10 L / pump");
  await page.locator("#sound").click();
  await expect(page.locator("#sound")).toHaveAttribute("aria-pressed", "true");
});

test("held mouse during automatic milestone cannot activate a choice", async ({
  page,
}) => {
  const g = new Game();
  g.state.offers = ["village"];
  g.start("village");
  g.run.produced = 245;
  g.run.wallet = 245;
  g.run.levels.solar = 1;
  await page.addInitScript(
    (state) => localStorage.setItem("pump-it-v2", JSON.stringify(state)),
    g.state,
  );
  await page.goto("/");
  await page.locator("#pause").click();
  const box = await page.locator("#pump").boundingBox();
  await page.mouse.move(box.x + 40, box.y + 30);
  await page.mouse.down();
  await expect(page.locator("#dialog")).toBeVisible();
  await page.waitForTimeout(800);
  await expect(page.locator(".choice").first()).toBeDisabled();
  await page.mouse.up();
  await choose(page);
  await expect(page.locator("#dialog")).not.toBeVisible();
});

test("pump art can be replaced through the manifest only", async ({ page }) => {
  await page.route("**/data/assets.js", async (route) => {
    const response = await route.fetch();
    const body = (await response.text()).replaceAll(
      "assets/pixel/pump-0.svg",
      "assets/pixel/solar.svg",
    );
    await route.fulfill({ response, body });
  });
  await start(page);
  await expect(page.locator("#pump-sprite")).toHaveCSS(
    "background-image",
    /solar.svg/,
  );
  await pumpClick(page);
  await expect(page.locator("#produced")).toHaveText("10");
});

test("paused HUD keeps list nodes and upgrades respond immediately", async ({
  page,
}) => {
  await start(page);
  await page.locator("#pause").click();
  const result = await page.evaluate(async () => {
    const milestone = document.querySelector("#milestones").firstChild;
    const journal = document.querySelector("#journal").firstChild;
    let mutations = 0;
    const observer = new MutationObserver(
      (records) => (mutations += records.length),
    );
    observer.observe(document.querySelector("#milestones"), {
      childList: true,
      subtree: true,
    });
    observer.observe(document.querySelector("#journal"), {
      childList: true,
      subtree: true,
    });
    await new Promise((resolve) => setTimeout(resolve, 500));
    observer.disconnect();
    return {
      mutations,
      sameMilestone:
        milestone === document.querySelector("#milestones").firstChild,
      sameJournal: journal === document.querySelector("#journal").firstChild,
    };
  });
  expect(result).toEqual({
    mutations: 0,
    sameMilestone: true,
    sameJournal: true,
  });
  await page.locator("#pause").click();
  await pumpClick(page);
  await expect(page.locator("#produced")).toHaveText("10");
});

test("pixel UI loads local art and fonts, and decision screens fit narrow phones", async ({
  page,
}) => {
  const missing = [];
  page.on("response", (response) => {
    if (response.status() >= 400) missing.push(response.url());
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator(".choice").first()).toBeEnabled();
  await page.screenshot({
    path: "test-results/expedition-menu.png",
    fullPage: true,
  });
  for (const width of [320, 390, 768]) {
    await page.setViewportSize({ width, height: 844 });
    expect(
      await page
        .locator("#dialog")
        .evaluate((e) => e.scrollWidth <= e.clientWidth),
    ).toBe(true);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await choose(page);
  await page.setViewportSize({ width: 320, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.locator("#skills").click();
  await expect(
    page.getByRole("button", { name: "Return to expedition" }),
  ).toBeEnabled();
  expect(
    await page
      .locator("#dialog")
      .evaluate((e) => e.scrollWidth <= e.clientWidth),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/narrow-skills.png",
    fullPage: true,
  });
  expect(missing).toEqual([]);
});
