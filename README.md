# Pump It!

An asset-driven incremental strategy game about clean-water projects. No runtime dependencies, build step, account, or server-side storage. The original pump/streak/upgrade/milestone loop and provided charity: water branding remain.

## Run

Use Node.js 20+:

```sh
npm start
```

Open **http://127.0.0.1:5173**. Use HTTP rather than opening index.html directly, because browsers restrict ES modules under file URLs. Deploy by serving these static files.

## Included systems

- Five replayable projects. Choose one Easy, Medium and Hard offer. Coastal projects unlock after two completions; wetland restoration requires Go further. Conditions change production and prices; objectives may require equipment or manual pumping.
- Five equipment types with solar/battery synergy, five milestone rewards, active streaks, and unlockable critical pumps.
- Twelve permanent skills in four connected branches with costs and prerequisites.
- Six event definitions, including a storm/cleanup chain, resource spending, timed penalties, price changes, risky repairs and skill-gated choices.
- Full-run persistence, legacy progression import, keyboard/touch controls, external image/audio assets, reduced-motion support and guarded decision dialogs.

## Structure

| File/directory         | Purpose                                                           |
| ---------------------- | ----------------------------------------------------------------- |
| `index.html`           | Semantic gameplay layout and native dialog                        |
| `styles/game.css`      | Responsive interface and feedback                                 |
| `scripts/main.js`      | Browser adapter, UI rendering and commands                        |
| `scripts/engine.js`    | DOM-independent gameplay state transitions                        |
| `scripts/save.js`      | Save validation, persistence and migration                        |
| `scripts/assets.js`    | Asset loading, animation and audio                                |
| `ui/dialog.js`         | Shared input guard, selection and confirmation                    |
| `data/content.js`      | Configurable upgrades, skills, projects, rewards and events       |
| `data/assets.js`       | Artwork, animation and sound manifest                             |
| `assets/placeholders/` | External SVG pump frames, landscape, village, water and equipment |
| `assets/audio/`        | External placeholder WAV cues                                     |
| `img/`                 | Original supplied branding and water-can images                   |
| `tests/`               | Gameplay/persistence tests and browser interaction tests          |

The original root `script.js` and `styles.css` are legacy files and are not loaded by the game.

## Replace assets

The placeholder SVGs are standalone image files, not artwork drawn by gameplay code. Replace them with PNG, WebP, SVG, GIF or other browser-supported images by editing **data/assets.js**. Transparent pump artwork should use the existing 400×350 aspect ratio for the easiest replacement.

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

**Projects:** configure `difficulty` (`Easy`, `Medium`, `Hard`), `goal`, `kp`, `manual`, `auto`, `cost`, `eventEvery`, `severity`, `condition`, `objective`, `name`, `description`, and `location`. Optional `minPumps`/`minUpgrades` define objectives; `unlock` is required completed-project count; `skill` is a required permanent skill ID. Eligible projects are sampled by difficulty without engine edits. Keep at least one initially eligible template in every difficulty. Water can exceed the target while a remaining objective is finished.

**Events:** define `id`, `name`, `category`, `description`, and `choices`. Choice `cost` is a fraction of the target; `skill` gates an option. Timed `effect` supports multiplicative `production`, `manual`, `auto`, `cost`, with a `name` and `duration`. Negative durations scale by project severity and resilience. `risk` selects `success`/`failure` effects; research and regulator levels improve odds. `followup` queues an event ID at the next interval. Mark that event `followupOnly` to exclude it from normal draws. Always provide a free, ungated, recoverable choice. Keep descriptions consistent with configured effects.

## Save and timing rules

`pump-it-v2` localStorage stores permanent progression, history, offers, the active run, effects and pending decisions. Saves happen every three seconds and on purchases, decisions, page exit and visibility changes. Loaded runs are paused. A browser that suppresses page-exit events may lose the last unsaved interval.

If no v2 save exists, the original `pump-it-progress` points, completion count and +2-per-tap permanent boosts migrate automatically. The original key is not deleted. Invalid saves recover to a fresh state with a notice; unavailable storage leaves gameplay functional with a save warning. Progress belongs to the browser and origin, including port.

All time is active-play time. Menus, pause and hidden tabs freeze production, event timers and effects. There is no offline production. Long frames are capped at one simulated second; effect expiration is integrated at the expiration boundary. Manual rate excludes combo/critical bonuses. Completion pays once. Large gains queue every crossed milestone before completion. New projects reset temporary progress and preserve knowledge/skills.

## Popup input protection

The dialog moves focus from the pump, blocks gameplay, and waits for released controls plus 450 ms of input quiet, with a minimum 650 ms settling interval. Only fresh pointer-down or non-repeated activation keys authorize button clicks. Selecting a choice never applies it: a separate confirmation gesture is required after another settling interval. Repeated taps in the original pump/choice location cannot commit a reward. Escape cannot skip mandatory decisions; other screens have explicit return controls.

## Test

```sh
npm install
npm test
npx playwright test
```

Browser tests use installed Microsoft Edge. On other systems change `channel` in `playwright.config.js`, or remove it and run `npx playwright install chromium`. Playwright and Prettier are development-only dependencies. Screenshots go to ignored `test-results/`.

Coverage includes resource accounting, milestone queues, duplicate prevention, permanent prerequisites, project conditions/objectives, reset behavior, event costs/outcomes/expiry/follow-ups, corrupted saves and migration, streaks, desktop completion, touch layouts, rapid clicks and keyboard controls. Balance is ready for further human playtesting; final art, music and device-specific tuning remain customizable.
