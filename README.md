# Pump It!

An asset-driven incremental strategy game about clean-water projects. No runtime dependencies, build step, account, or server-side storage. The original pump/streak/upgrade/milestone loop and provided charity: water branding remain.

## Run

Use Node.js 20+:

```sh
npm start
```

Open **http://127.0.0.1:5173**. Use HTTP rather than opening index.html directly, because browsers restrict ES modules under file URLs. Deploy by serving these static files.

## Included systems

- Procedurally generated expeditions across five location types, with progressively higher targets and independent objectives/conditions. Each set has Easy, Medium and Hard options. Coastal locations unlock after two completions; wetland restoration requires Go further.
- Five equipment types with solar/battery synergy, five milestone rewards, active streaks, and unlockable critical pumps.
- Twelve permanent skills in four connected branches with costs and prerequisites.
- Six event definitions, including a storm/cleanup chain, resource spending, timed penalties, price changes, risky repairs and skill-gated choices.
- Full-run persistence, legacy progression import, keyboard/touch controls, external image/audio assets, reduced-motion support and guarded decision dialogs.

## Structure

| File/directory                         | Purpose                                                           |
| -------------------------------------- | ----------------------------------------------------------------- |
| `index.html`                           | Semantic gameplay layout and native dialog                        |
| `styles/game.css`                      | Responsive interface and feedback                                 |
| `scripts/main.js`                      | Browser adapter, UI rendering and commands                        |
| `scripts/engine.js`                    | DOM-independent gameplay state transitions                        |
| `scripts/save.js`                      | Save validation, persistence and migration                        |
| `scripts/assets.js`                    | Asset loading, animation and audio                                |
| `ui/dialog.js`                         | Shared input guard, selection and confirmation                    |
| `data/content.js`                      | Upgrades, skills, rewards, events and frozen legacy project data  |
| `data/project-archetypes.js`           | Location and story definitions                                    |
| `data/project-generation.js`           | Difficulty tiers, independent objectives and condition budgets    |
| `scripts/systems/project-generator.js` | Recipe generation, variety history and recipe validation          |
| `data/assets.js`                       | Artwork, animation and sound manifest                             |
| `assets/pixel/`                        | Original grid-aligned landscape, animated pump, village and icons |
| `assets/audio/`                        | External placeholder WAV cues                                     |
| `img/`                                 | Original supplied branding and water-can images                   |
| `tests/`                               | Gameplay/persistence tests and browser interaction tests          |

The original root `script.js` and `styles.css` are legacy files and are not loaded by the game.

## Visual design

The Riverlands art direction uses a charity: water yellow-and-white interface, charcoal pixel outlines, chunky framed controls, and original pixel scenery. Press Start 2P is used for display text; VT323 keeps gameplay information readable. Both fonts are bundled locally in `assets/fonts/`, with their SIL Open Font License files. No external font service is required. Motion respects reduced-motion preferences.

## Replace assets

The original pixel SVGs are standalone image files, not artwork drawn by gameplay code. Regenerate them with `node scripts/build-pixel-art.js`. Replace them with PNG, WebP, SVG, GIF or other browser-supported images by editing **data/assets.js**. Transparent pump artwork should use the existing 100×88 aspect ratio for the easiest replacement.

```js
// Static image
pump: { src: 'assets/my-art/pump.png' }

// Individual animation frames
pump: {
  src: 'assets/my-art/pump-idle.png',
  animation: {
    frames: ['assets/my-art/pump-0.png', 'assets/my-art/pump-1.png'],
    fps: 16
  }
}

// Regular rectangular sprite sheet
pump: {
  src: 'assets/my-art/pump-idle.png',
  animation: {
    sheet: 'assets/my-art/pump-sheet.png',
    frameWidth: 400, frameHeight: 350,
    columns: 4, count: 8, fps: 16
  }
}
```

Sheet frames must be equally sized, arranged in a full rectangular grid, and share the displayed pump's aspect ratio. Columns/count control positioning; frameWidth/frameHeight record source geometry. Animation plays once per accepted pump and returns to idle. Reduced-motion preferences disable animation. Scene composition is styled separately from gameplay in the stylesheet.

Change `sounds` paths to your WAV/MP3/OGG assets. Set a cue to `null` to disable it, or set `music` to a file to enable looping music. Sound starts only after the player enables it. Supplied tones are placeholders, not final sound design.

## Add content

Edit **data/content.js**. Content is trusted developer-authored configuration, not untrusted remote input. Keep IDs unique and stable: saved games refer to them.

**Equipment:** add `id`, `name`, `description`, `cost`, `growth`, `icon`, and `effect`; add its icon to the asset manifest. Supported additive effects: `tap`, `auto`, `power`, `synergy`. `power: .18` adds 18 percentage points to global production. `synergy` boosts automation per solar level. Prices are base × growth^level × project cost × permanent discount × temporary cost multipliers, rounded up.

**Milestone rewards:** add `id`, `name`, `description`, and `effect`, using production keys above or `wallet` for spendable supplies. Three distinct rewards are drawn at each of 25%, 50% and 75% completion.

**Skills:** add `id`, `branch`, `name`, `cost`, `requires` (IDs), `description`, and `effect`. The renderer groups branches in declaration order. Keep visual branches as linear prerequisite chains; cross-branch prerequisites are enforced and named, but arbitrary graph edges need renderer work. Supported effects: `manual`, `automation`, `combo`, `crit`, `discount`, `hybrid`, `luck`, `resilience`, `protocol`, `starting`, `kp`, `access`. New mechanic types require engine support, not only descriptions.

**Projects:** add setting-only locations to `data/project-archetypes.js` using a stable `id`, `name`, `description`, `location`, and optional `unlock` (completion count) or `skill` gate. Add independent conditions and objectives in `data/project-generation.js`; see Progressive project generation below for the difficulty, budget and persistence rules. Keep three initially available locations. Water remains earnable after the target while other objectives are unfinished.

**Events:** define `id`, `name`, `category`, `description`, and `choices`. Choice `cost` is a fraction of the target; `skill` gates an option. Timed `effect` supports multiplicative `production`, `manual`, `auto`, `cost`, with a `name` and `duration`. Negative durations scale by project severity and resilience. `risk` selects `success`/`failure` effects; research and regulator levels improve odds. `followup` queues an event ID at the next interval. Mark that event `followupOnly` to exclude it from normal draws. Always provide a free, ungated, recoverable choice. Keep descriptions consistent with configured effects.

## Save and timing rules

`pump-it-v2` localStorage stores permanent progression, history, offers, the active run, effects and pending decisions. Saves happen every three seconds and on purchases, decisions, page exit and visibility changes. Loaded runs are paused. A browser that suppresses page-exit events may lose the last unsaved interval.

If no v2 save exists, the original `pump-it-progress` points, completion count and +2-per-tap permanent boosts migrate automatically. The original key is not deleted. Invalid saves recover to a fresh state with a notice; unavailable storage leaves gameplay functional with a save warning. Progress belongs to the browser and origin, including port.

All time is active-play time. Menus, pause and hidden tabs freeze production, event timers and effects. There is no offline production. Long frames are capped at one simulated second; effect expiration is integrated at the expiration boundary. Manual rate excludes combo/critical bonuses. Completion pays once. Large gains queue every crossed milestone before completion. New projects reset temporary progress and preserve knowledge/skills.

## Popup input protection

The dialog moves focus from the pump, blocks gameplay, and waits once on opening for released controls plus 450 ms of input quiet, with a minimum 650 ms settling interval. Only fresh pointer-down or non-repeated activation keys authorize button clicks. After this initial guard, choices can be selected and switched immediately without restarting the delay. Selecting a choice never applies it: a separate confirmation gesture is required and is available immediately. Repeated taps in the original pump/choice location cannot commit a reward. Escape cannot skip mandatory decisions; other screens have explicit return controls.

## Test

```sh
npm install
npm test
npx playwright test
```

Browser tests use installed Microsoft Edge. On other systems change `channel` in `playwright.config.js`, or remove it and run `npx playwright install chromium`. Playwright and Prettier are development-only dependencies. Screenshots go to ignored `test-results/`.

Coverage includes resource accounting, milestone queues, duplicate prevention, permanent prerequisites, project conditions/objectives, reset behavior, event costs/outcomes/expiry/follow-ups, corrupted saves and migration, streaks, desktop completion, touch layouts, rapid clicks and keyboard controls. Balance is ready for further human playtesting; final art, music and device-specific tuning remain customizable.

## Progressive project generation

New expeditions combine a location from `data/project-archetypes.js` with an independent objective and condition recipe from `data/project-generation.js`. The old `projects` export in `data/content.js` is frozen compatibility data for existing saves; edit the new files for new gameplay content.

Each completion advances the expedition number. Every tier's water target increases by 14% of its original base target per completion, rounded up to 25 L. This is linear growth, not compounding exponential growth; relative increases get gentler over time. Easy/Medium/Hard remain relative choices within the current expedition. KP rewards gain one point every four completions. A project can finish only after its water target and **all** displayed objectives are met.

Objectives include supply delivery, manual participation, equipment installation, and combined participation/equipment goals. Their requirements increase gradually (capped at 200 manual pumps and 12 equipment levels). Conditions are rolled independently, subject to unlock levels and a penalty budget. Later Medium/Hard offers can combine two conditions after six completions. Production never falls below 70% manual or 65% automatic from project conditions; equipment markup is capped at 35%, incident duration at ×1.65, and event intervals at a minimum 20 seconds (32 for Easy). Temporary event effects can still alter those rates during play.

The generator avoids the last 18 offered location/objective/condition combinations, preferring distinct conditions and distinct locations within each set. If a configurable pool is exhausted, it reuses the least-recent combination; its water requirement still advances. Restarting does not increase difficulty or reroll conditions. Offers and active recipes are saved exactly, so reopening menus or reloading cannot reroll them. Existing active projects and old saved offers retain their original requirements; newly generated sets use the new progression.

Add locations without copying mechanical modifiers. Add objective/condition definitions with stable IDs and appropriate unlock levels and weights. Keep at least three initially available locations. New objective kinds require matching goal construction and completion checks. Do not change old recipe definitions in a shipped save version without a migration: saved numeric requirements are checked against their recipe to reject corrupted state.

## Maintenance and performance

The browser controller in `scripts/main.js` handles commands and menus. `ui/game-view.js` owns HUD rendering and caches its DOM references; `ui/format.js` shares number/time formatters. Automatic HUD updates run at 10 Hz, while clicks, purchases and new decisions render immediately. Paused/menu screens skip recurring HUD work. Milestones, effects and journal lists rebuild only when their visible content changes. Input-guard polling runs only while a dialog is waiting to become interactive.

The simulation remains independent of the HUD refresh rate. It integrates at effect, streak and event boundaries, so changing frame duration cannot extend a production bonus or generate extra water before an event. Unchanged successful save payloads skip localStorage writes; failed writes are retried normally. Save validation checks milestone accounting and supports new generated locations independently of frozen legacy templates.

Project generation filters compact recipes, then builds only the three chosen display objects. The candidate ordering and random selection behavior are preserved. A local 200-set benchmark improved from approximately 1.94 seconds to 0.14 seconds; this is a machine-specific measurement, not a browser-wide performance guarantee.

Run `npm test`, `npm run test:browser`, and `npm run format:check` when changing gameplay or rendering. Regression coverage includes timing boundaries, corrupted milestone queues, save-write retries, new-location persistence, and stable paused HUD nodes in addition to the existing progression/input tests.
