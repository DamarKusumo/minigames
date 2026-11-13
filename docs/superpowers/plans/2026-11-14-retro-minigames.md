# Retro Minigames Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A static, Caddy-deployed retro minigames site (Snake, Sudoku, Bounce) with a menu → level select → game shell, per-game levels, and localStorage progress — extensible by adding one file per new game.

**Architecture:** Vanilla ES modules, no build step. Each game is one module exporting a descriptor (`{id, name, icon, blurb, levels, mount}`); `app.js` renders a three-view shell from a registry array. Pure game logic lives as named exports in the same file (DOM only touched inside `mount`), so `node --test` can cover it without a browser.

**Tech Stack:** HTML, CSS, vanilla JS (ES modules), Node's built-in test runner (`node --test`), Caddy for static serving.

**Spec:** `docs/superpowers/specs/2026-11-14-retro-minigames-design.md`

## Global Constraints

- No npm dependencies; the only package.json content allowed is `{"type":"module"}`.
- No backend, no database; progress only via `localStorage` keys `minigames:<gameId>:high:<levelId>` and `minigames:<gameId>:unlocked`.
- Adding a game later = one new file in `games/` + one import + one array entry in `js/app.js`. No other file changes.
- All games solo; keyboard primary input.
- Deploy: add `minigames.mudaku.my.id { root * /home/kusumo/minigames; file_server }` to `../Caddyfile`, then `caddy reload`.
- Commit after every task (repo starts with `git init`).

## Review Focus

1. **Re-entering a game doesn't double-run loops** — pressing back then replaying must leave exactly one `requestAnimationFrame`/interval running. Test: mount returns cleanup that stops the loop; Task 3 mounts/unmounts twice in the browser check.
2. **`onCleared` fires exactly once per level** — Snake hitting the score target or Bounce clearing bricks must unlock once, not per frame. Test: logic returns a `cleared` flag only on the transition tick (Tasks 4, 6).
3. **localStorage unavailable (private mode)** — game must still play; only persistence is lost. Test: `storage.js` falls back to an in-memory map when `globalThis.localStorage` throws on access (Task 1).
4. **Sudoku puzzles are solvable and have a unique solution** — generator must not ship ambiguous grids. Test: solver counts exactly 1 solution for generated puzzles at every difficulty (Task 5).
5. **Level unlock persists across reloads** — cleared level stays unlocked after refresh. Test: storage round-trip `setUnlockedLevel` → `getUnlockedLevel` (Task 1), browser check in Task 3.

---

### Task 1: Project scaffold + storage

**Files:**
- Create: `package.json` (`{"type":"module"}` only)
- Create: `index.html`
- Create: `css/style.css` (retro theme shell only: dark bg, monospace, neon accents, card grid + view containers)
- Create: `js/storage.js`
- Create: `test/storage.test.js`
- Create: `README.md` (how to run locally: `python3 -m http.server`; deploy note)

**Interfaces:**
- Consumes: nothing
- Produces (used by Tasks 2–6):
  - `getHighScore(gameId: string, levelId: number): number | null`
  - `setHighScore(gameId: string, levelId: number, score: number): void`
  - `getUnlockedLevel(gameId: string): number` — defaults to `1`
  - `setUnlockedLevel(gameId: string, level: number): void`
  - `index.html` with `#app` root, linked `css/style.css`, `<script type="module" src="js/app.js">`

- [ ] **Step 1: Write the failing tests**

`test/storage.test.js` — before each test, set `globalThis.localStorage` to a fresh `Map`-backed fake with `getItem/setItem/removeItem`; clear the module's keys between tests via a `resetStorage()` export.

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { getHighScore, setHighScore, getUnlockedLevel, setUnlockedLevel, resetStorage } from '../js/storage.js';

test('high score round-trips', () => {
  setHighScore('snake', 3, 42);
  assert.equal(getHighScore('snake', 3), 42);
  assert.equal(getHighScore('snake', 4), null);
});

test('unlocked level defaults to 1 and round-trips', () => {
  assert.equal(getUnlockedLevel('bounce'), 1);
  setUnlockedLevel('bounce', 4);
  assert.equal(getUnlockedLevel('bounce'), 4);
});

test('plays when localStorage throws (private mode)', () => {
  const real = globalThis.localStorage;
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    get() { throw new Error('denied'); },
  });
  assert.doesNotThrow(() => { setHighScore('snake', 1, 5); getUnlockedLevel('snake'); });
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: real });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test test/storage.test.js`
Expected: FAIL (module not found)

- [ ] **Step 3: Implement `js/storage.js`**

Key format: `minigames:${gameId}:high:${levelId}` / `minigames:${gameId}:unlocked`. Private-mode test dictates the approach: a `getStore()` helper that tries `globalThis.localStorage` inside `try/catch` and returns a module-level in-memory `Map` shim on failure; all four getters/setters go through it. Export `resetStorage()` (clears the in-memory map) for tests.

- [ ] **Step 4: Create scaffold files**

`package.json` exactly `{"type":"module"}`. `index.html` with `#app`, stylesheet link, module script for `js/app.js` (file may be empty stub `export {};` until Task 2 — comment the stub so Task 2 overwrites it). `css/style.css`: body dark background, monospace font, `.card` grid styles, `.view` visibility helpers. `README.md` with local-run and Caddy deploy instructions.

- [ ] **Step 5: Run tests to verify they pass**

Run: `node --test test/storage.test.js`
Expected: PASS, 3 tests

- [ ] **Step 6: Commit**

```bash
git init
git add -A
git commit -m "feat: scaffold static site and localStorage helpers"
```

---

### Task 2: Shell — registry, three views

**Files:**
- Modify: `js/app.js` (replace stub)
- Create: `test/registry.test.js`
- Modify: `css/style.css` (level-select list styles if missing)

**Interfaces:**
- Consumes: `js/storage.js` from Task 1 (not directly required here; unlock display reads via Task 3 wiring — shell itself only needs the registry contract)
- Produces (used by Tasks 4–6):
  - Game descriptor type: `{ id: string, name: string, icon: string, blurb: string, levels: Array<{id: number, label: string, ...gameSpecific}>, mount(root: HTMLElement, options: { level: number, onScore(best: number): void, onCleared(levelId: number): void }): () => void }`
  - Registry: `export const games = [/* descriptors */]` in `js/app.js`
  - Views: `renderMenu()`, `renderLevelSelect(game)`, `renderGame(game, levelId)` — internal to app.js, wired to `#app`
  - Back behavior: game view → level select; level select → menu

- [ ] **Step 1: Write the failing test**

`test/registry.test.js` — imports `games` from `../js/app.js` (app.js must not touch DOM at import time; all rendering inside functions called from a `if (document) boot()` guard or equivalent so node can import it):

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { games } from '../js/app.js';

test('every game descriptor has the full contract', () => {
  assert.ok(games.length >= 3);
  for (const g of games) {
    assert.ok(g.id && g.name && g.icon && g.blurb);
    assert.ok(Array.isArray(g.levels) && g.levels.length > 0);
    assert.equal(typeof g.mount, 'function');
    for (const l of g.levels) assert.equal(typeof l.id, 'number');
  }
});

test('game ids are unique', () => {
  assert.equal(new Set(games.map(g => g.id)).size, games.length);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/registry.test.js`
Expected: FAIL (export `games` not found / empty)

- [ ] **Step 3: Implement the shell in `js/app.js`**

Registry with **placeholder descriptors** for `snake`, `sudoku`, `bounce` (real `levels`/`mount` arrive in Tasks 4–6; placeholder `mount` renders a "coming soon" line and returns `() => {}`). `renderMenu`: card grid from registry, click → `renderLevelSelect`. `renderLevelSelect`: list levels, clicking a level → `renderGame(game, level.id)`. `renderGame`: clear `#app`, call `mount(container, opts)`, store cleanup; Back button runs cleanup then `renderLevelSelect`. `onCleared`/`onScore` wired in Task 3 — leave them as no-op callbacks for now. Boot only when `document` exists.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/registry.test.js`
Expected: PASS

- [ ] **Step 5: Browser smoke check**

Run: `python3 -m http.server` → open `http://localhost:8000` → menu shows 3 cards, click through level select to placeholder game, Back works at every level.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: three-view shell with game registry"
```

---

### Task 3: Unlock wiring + browser progress check

**Files:**
- Modify: `js/app.js` (wire `onCleared`/`onScore` to storage; show lock state in `renderLevelSelect`)

**Interfaces:**
- Consumes: `getUnlockedLevel/setUnlockedLevel/setHighScore` from Task 1; shell from Task 2
- Produces: `renderLevelSelect` disables levels with `id > getUnlockedLevel(game.id)`, except when the descriptor has `freeChoice: true` (Task 5 sets this on Sudoku) — then every level is selectable

- [ ] **Step 1: Wire callbacks in `renderGame`**

`onScore(best)` → `setHighScore(game.id, levelId, best)` when higher than current. `onCleared(levelId)` → `setUnlockedLevel(game.id, max(current, levelId + 1))` and refresh so next level unlocks.

- [ ] **Step 2: Lock rendering in `renderLevelSelect`**

Disabled attribute + visual dimming for locked levels; skip when `game.freeChoice === true`.

- [ ] **Step 3: Browser check**

Play a placeholder that manually invokes `onCleared` (temporarily: a "clear" button in placeholder mount) → Back → level 2 enabled → reload page → still enabled.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: persist unlocks and high scores through shell"
```

---

### Task 4: Snake

**Files:**
- Create: replace `games/snake.js` with real module (placeholder registered in Task 2 lives at same path — overwrite; registry entry stays)
- Create: `test/snake.test.js`

**Interfaces:**
- Consumes: descriptor contract (Task 2), storage (via shell)
- Produces: named pure exports:
  - `LEVELS`: 6 levels, each `{id, label, target, speedMs, maze}` where `maze` is `string[]` of `#`/`.` rows (level 1: all-open, later levels add wall patterns)
  - `createGame(level)`: returns initial state `{snake: [{x,y}], dir, nextDir, food, score, walls, cleared: false, dead: false}`
  - `step(state, input?): state` — moves one tick; handles eat (grow + score), wall/self collision → `dead`, score ≥ target → `cleared: true` (flag only on that tick) and stops
  - `setDir(state, dir)` — rejects reversing directly into own neck

- [ ] **Step 1: Write failing tests**

`test/snake.test.js` key cases:
- snake grows and score increments when head reaches food
- head hitting wall from LEVELS[0].maze edge → `dead`
- head hitting own body → `dead`
- score reaching `target` sets `cleared: true` exactly once (step again → still `cleared`, not re-flagged as fresh)
- `setDir` cannot reverse 180° into the neck

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/snake.test.js`
Expected: FAIL (exports missing)

- [ ] **Step 3: Implement pure logic in `games/snake.js`**

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/snake.test.js`
Expected: PASS

- [ ] **Step 5: Implement `mount`**

Canvas or DOM-grid render of maze + snake + food; `requestAnimationFrame` or interval at `level.speedMs`; arrow/WASD → `setDir`; on tick: if `state.dead` → game-over overlay (restart button); if `state.cleared` → call `options.onCleared(level.id)` once, show "Level clear!" overlay; `options.onScore` on each eat (for best-score display). Returns cleanup that cancels the loop and removes key listeners.

- [ ] **Step 6: Browser check**

Play level 1, hit target, unlock persists after reload; Back mid-game stops movement (re-enter → single loop).

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: snake with mazes, score targets, level unlocks"
```

---

### Task 5: Sudoku

**Files:**
- Create: replace `games/sudoku.js`
- Create: `test/sudoku.test.js`

**Interfaces:**
- Consumes: descriptor contract; shell `freeChoice: true` convention (Task 3)
- Produces: named pure exports:
  - `SUDOKU_LEVELS`: `[{id:1,label:'Easy',holes:36},{id:2,label:'Medium',holes:45},{id:3,label:'Hard',holes:52}]`
  - `generateSudoku(holes, rng = Math.random)`: returns `{puzzle: (number|null)[81], solution: number[81]}`
  - `solveCount(grid: (number|null)[]): number` — number of valid solutions (0, 1, or capped at 2 for speed)
  - `isValidPlacement(grid, index, value): boolean`

- [ ] **Step 1: Write failing tests**

`test/sudoku.test.js`:
- `solution` has no duplicate in any row, col, or 3×3 box
- `puzzle` equals solution except exactly `holes` nulls, and every non-null cell matches solution
- `solveCount(puzzle) === 1` for each difficulty (sample 2 grids each with seeded rng — pass a tiny seeded rng in tests)
- `isValidPlacement` rejects a value already in the row

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/sudoku.test.js`
Expected: FAIL

- [ ] **Step 3: Implement generator + solver in `games/sudoku.js`**

Fill a full valid grid (backtracking with shuffled candidates), then remove `holes` cells randomly; `solveCount` via backtracking with early exit at 2.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/sudoku.test.js`
Expected: PASS

- [ ] **Step 5: Implement `mount`**

9×9 grid (click cell → number pad or keys 1–9, Backspace clears); conflict highlighting via `isValidPlacement`; check button or auto-detect full+correct → `options.onCleared(level.id)` (Sudoku "clear" = correct complete grid; also show best time via `onScore` in seconds — lower is better, shell stores it as-is). Level select already shows all difficulties unlocked (`freeChoice`).

- [ ] **Step 6: Browser check**

Generate each difficulty, confirm playable and win path fires unlock callback (console log is enough).

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: sudoku with difficulties and unique-solution generator"
```

---

### Task 6: Bounce (Breakout)

**Files:**
- Create: replace `games/bounce.js`
- Create: `test/bounce.test.js`

**Interfaces:**
- Consumes: descriptor contract
- Produces: named pure exports:
  - `LEVELS`: 6 levels, each `{id, label, ballSpeed, paddleSpeed, bricks: string[]}` — brick rows of chars: `.`=empty, `1`=1-hit, `2`=2-hit
  - `createGame(level)`: `{bricks, ball:{x,y,dx,dy}, paddle:{x,w}, score, lives, cleared:false, dead:false}`
  - `step(state): state` — one tick: ball move, paddle/brick/wall bounce, lose life (→ reset ball) at 0 lives → `dead`, no bricks left → `cleared: true` once
  - `movePaddle(state, dir: -1|0|1)` — clamps to walls

- [ ] **Step 1: Write failing tests**

`test/bounce.test.js`:
- ball bouncing off top wall reverses `dy`
- paddle hit reverses `dy` upward (not downward)
- brick at ball position: `1-hit` brick removed, `2-hit` decremented; score increments
- last brick removed → `cleared: true` on that step only
- paddle clamped at both edges
- ball below bottom → `dead` when lives hit 0

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/bounce.test.js`
Expected: FAIL

- [ ] **Step 3: Implement pure logic in `games/bounce.js`**

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/bounce.test.js`
Expected: PASS

- [ ] **Step 5: Implement `mount`**

Canvas render; arrow keys/A-D → `movePaddle`; loop at fixed timestep; `cleared` → `options.onCleared(level.id)` + overlay; `dead` → game-over/restart; `onScore` per brick. Cleanup cancels loop and listeners.

- [ ] **Step 6: Browser check**

Clear level 1 → level 2 unlocks and persists; back-and-forth between menu and game leaves one loop.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: bounce with brick layouts and level unlocks"
```

---

### Task 7: Deploy + full regression

**Files:**
- Modify: `../Caddyfile` (add minigames block from spec)
- Modify: `README.md` (final instructions)

**Interfaces:**
- Consumes: all Tasks 1–6

- [ ] **Step 1: Run all tests**

Run: `node --test test/`
Expected: all PASS

- [ ] **Step 2: Browser regression**

Menu → each of the 3 games → play → back → menu; reload keeps unlocks; no console errors.

- [ ] **Step 3: Add Caddy block**

Append to `../Caddyfile`:

```
minigames.mudaku.my.id {
	root * /home/kusumo/minigames
	file_server
}
```

Do **not** reload Caddy without the user present (outward-facing infra change) — tell the user to run `caddy reload` (or ask permission to run it).

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: caddy deploy config and final docs"
```
