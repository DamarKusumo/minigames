# Retro Minigames — Design Doc

**Date:** 2026-11-14
**Status:** draft, pending human approval

## Intent and why

A nostalgic, browser-based collection of solo minigames (Snake, Sudoku, Bounce to start) with a game-picker home screen. The user wants something that feels like the old classics, requires no backend or database, and — most importantly — is easy to extend with more games later.

## Goals

- Static site, deployed behind the existing Caddy reverse proxy (see Deployment).
- Home screen: grid of game cards; click a card → play; back → menu.
- Three games at launch: **Snake**, **Sudoku**, **Bounce** (Breakout).
- Levels per game (meaning differs per game, see below).
- Progress (unlocked levels, best scores) persists via `localStorage` — no server.
- **Adding a game later = add one file + one registry entry. No touching other games.**

## Non-goals / anti-goals

- No backend, no accounts, no database.
- No multiplayer (all solo).
- No build step, no framework, no npm dependencies (see Approaches).
- No sound/music assets in v1 (CSS/canvas visuals only; can be added later).
- Not a pixel-perfect emulation of any original game — nostalgic feel, not ROM accuracy.

## Constraints

- Vanilla HTML/CSS/JS only (ES modules work natively in browsers via `file://` only if served — see Shortcut note below).
- Must work in a modern browser with keyboard input; Snake and Bounce should also be playable on touch where reasonable (optional stretch, not required for v1).
- Single shared layout/theme so all games look like one collection.

## Approaches considered

1. **Vanilla HTML/CSS/JS, no build step** — one `index.html`, shared `css`, a `games/` folder with one module per game, and a tiny registry. ✅ **Chosen.** Zero tooling, matches the lightweight nostalgic goal, trivially hostable.
2. **Vite + React (or similar framework)** — nicer state handling, but adds a build step, node_modules, and tooling for what is fundamentally canvas/DOM + keyboard input. Rejected: overkill, and worse for "just open it and play."

## Architecture (the decided how)

### Game registry — the extensibility contract

Each game is one ES module exporting a standard descriptor:

```js
// games/snake.js
export default {
  id: 'snake',
  name: 'Snake',
  icon: '🐍',
  blurb: 'Eat, grow, don\'t bite yourself',
  levels: [
    { id: 1, label: 'Level 1 — Slow garden' },
    { id: 2, label: 'Level 2 — Fast field' },
    // ...
  ],
  // mount is called when the game is opened; root is a DOM element.
  // options = { level: <level id>, onScore(best), onCleared(levelId) }
  mount(root, options) {
    // build UI inside root, start game loop
    // return a cleanup() function called on "back to menu"
    return () => { /* stop loop, remove listeners */ };
  },
};
```

`index.js` imports each game and pushes it into a registry array:

```js
import snake from './games/snake.js';
import sudoku from './games/sudoku.js';
import bounce from './games/bounce.js';
const games = [snake, sudoku, bounce];
```

**Adding game N+1 later:** create `games/foo.js`, add one import + one array entry. Nothing else changes.

### Shell (`index.html` + `app.js`)

- Three views: **menu** (card grid) → **level select** (list of levels/difficulties for the chosen game, locked ones disabled) → **game** (mount area + back button).
- `app.js` renders the menu from the registry; card click → level select; level click → `game.mount(root, { level, onCleared, onScore })`; back → stored `cleanup()`, then re-render previous view.
- `onCleared(levelId)`: game calls this when the level is beaten (e.g. Bounce clears bricks, Snake hits score target); shell records unlock in storage.
- One shared stylesheet with a retro theme (dark background, pixel-ish font via system monospace or a single embedded Google font, neon accents).

### Deployment

Served as static files by the existing Caddy instance (`../Caddyfile`). Add:

```
minigames.mudaku.my.id {
	root * /home/kusumo/minigames
	file_server
}
```

(then `caddy reload`). Served over HTTPS, so ES modules load normally — no `file://` concerns. Local dev: `python3 -m http.server` in the project dir. **Domain `minigames.mudaku.my.id` is the builder's assumption — confirm if different.**

### Persistence (`storage.js`)

Tiny helper over `localStorage`:

- `getHighScore(gameId, levelId)` / `setHighScore(gameId, levelId, score)`
- `getUnlockedLevel(gameId)` / `setUnlockedLevel(gameId, level)`

No schema beyond flat keys: `minigames:snake:high:1`, `minigames:snake:unlocked`.

### Levels per game

| Game | "Level" means | Progression |
|------|---------------|-------------|
| Snake | Speed tier + maze layout (Nokia-style) | **Score target per level** (e.g. eat N apples) → next unlocks; hitting target also ends the run |
| Sudoku | Difficulty (Easy / Medium / Hard, procedurally generated) | Difficulty chosen freely on card; no lock |
| Bounce | Hand-coded brick layouts, ball speed | Clear screen → next unlocks |

Sudoku is the exception: difficulty is a free choice rather than a lock, because locking puzzle difficulty behind progression doesn't match how people play Sudoku.

### File layout

```
minigames/
├── index.html
├── css/
│   └── style.css
├── js/
│   ├── app.js          # shell: menu view, game view, registry wiring
│   └── storage.js      # localStorage helpers
└── games/
    ├── snake.js
    ├── sudoku.js
    └── bounce.js
```

## What's left to the builder

- Concrete game logic for each of the three games (grid rules, puzzle generation/solving, paddle physics).
- Exact visual theme details (colors, fonts) — pick something cohesive and retro.
- Level content: number of Snake/Bounce levels (suggest 5–10 each to start) and per-level score targets for Snake.
- Local dev note in a README: `python3 -m http.server` (ES modules don't run from `file://`).

## Shortcut / known limits

- `shortcut:` no `file://` double-click support (ES modules need a server) — accepted; deployment via Caddy and local dev via `http.server` cover real use.
