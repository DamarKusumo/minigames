# Bounce Power-ups & Descending Bricks Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add retro skill drops and per-level descending brick formations to Bounce, with bottom-reach as a new fail condition.

**Architecture:** All gameplay logic stays pure and testable in `games/bounce.js` (`fallBricks`, `splitBalls`, `fallDrops`, `step` over `state.balls[]`); the existing `mount` wires timers/draw/overlay only. Levels 1–2 keep `fallMs: 0` (static); levels 3–6 fall on per-level intervals.

**Tech Stack:** Vanilla ES modules, `node --test`, headless dump-dom smoke harness. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-11-14-bounce-powerups-descent-design.md`

## Global Constraints

- Zero npm dependencies; no build step; test command is `node --test test/*.test.js` (directory form is broken — never use `node --test test/`).
- Commit messages end with `Co-Authored-By: Claude Code <noreply@anthropic.com>`; repo branch is `master`, commits stay local (no push).
- Existing 30 unit tests and 36 smoke steps must stay green; smoke runs via `python3 -m http.server 8000` + `/snap/bin/chromium --headless --no-sandbox --disable-gpu --window-size=800,600 --virtual-time-budget=25000 --dump-dom http://localhost:8000/test/smoke.html` (parse `<div id="result">`).
- Exact spec values: `fallMs` = 0/0/5000/4000/3000/2200 for levels 1–6; breach row = brick row index ≥ `Math.floor(PADDLE_Y / CELL)` (= 19); skill drop chance = 1-in-4 (`rng() < 0.25`); Wide = paddle 80px for 625 ticks (10s @16ms); Slow = velocity ×0.6 for 500 ticks (8s @16ms); Multi = 3 balls total when starting from 1; drop fall speed = 1.5px/tick.
- `step()` never sleeps or reads the clock — all time is tick counts; pause already gates `tick()` early-return in `mount`.

## Review Focus

1. **Multi-ball partial loss:** with 3 balls, two falling off must NOT cost a life; only all-gone triggers `lives -= 1` (respawn one ball if lives remain). → Task 2 test `losing one of three balls costs no life`.
2. **Fall vs. clear race:** if `state.cleared` is already true, `fallBricks` must no-op (winning on the last moment before a fall still counts). → Task 1 test `fall is a no-op once cleared`.
3. **Wide-expiry edge clamp:** when the wide timer expires, paddle width returns to `PADDLE_W` and `paddle.x` is re-clamped into `[w/2, W-w/2]` so the paddle can't sit outside the field. → Task 3 test `wide expiry re-clamps paddle`.
4. **Slow must not mutate base velocity:** `dx`/`dy` stay at `level.ballSpeed` values; the 0.6 factor applies only during position integration, so slow expiring restores full speed instantly. → Task 3 test `slow factor leaves dx unchanged`.
5. **Paused game must not fall or drop:** `tick()` already returns when `paused`; `fallBricks`/`fallDrops` are only called from `tick` after that guard — verify no call site exists elsewhere. → Task 4 step asserts pause smoke still passes (`bounce alive after ticks`).

---

### Task 1: Descent — `fallMs` config + `fallBricks()`

**Files:**
- Modify: `games/bounce.js` (LEVELS entries, new export)
- Test: `test/bounce.test.js`

**Interfaces:**
- Consumes: existing `LEVELS`, `createGame`, `PADDLE_Y`, `CELL`, `H`.
- Produces: each `LEVELS[i]` has `fallMs: number` (0, 0, 5000, 4000, 3000, 2200); `export function fallBricks(state): void` — shifts `state.bricks` down one row (prepend `[Array(cols).fill(0)]`), sets `state.dead = true` and `state.deadReason = 'bricks'` if any live brick sits in row ≥ 19; no-ops when `state.dead || state.cleared`.

- [ ] **Step 1: Write the failing tests**

```js
test('levels 1-2 never fall, 3-6 fall with faster intervals', () => {
  assert.deepEqual(LEVELS.map((l) => l.fallMs), [0, 0, 5000, 4000, 3000, 2200]);
});

test('fallBricks shifts the formation down one row', () => {
  const g = createGame(singleBrick); // bricks: ['1...............']
  fallBricks(g);
  assert.equal(g.bricks[0].every((v) => v === 0), true); // top row now empty
  assert.equal(g.bricks[1][0], 1);                       // brick moved to row 1
  assert.equal(g.dead, false);
});

test('fall is a no-op once cleared', () => {
  const g = createGame(singleBrick);
  g.cleared = true;
  const before = JSON.stringify(g.bricks);
  fallBricks(g);
  assert.equal(JSON.stringify(g.bricks), before);
  assert.equal(g.dead, false);
});

test('live brick shifting past paddle row sets dead with bricks reason', () => {
  const g = createGame(singleBrick);
  // 20 rows (0-19); a live brick at row 19 shifts to row 20 on the next fall → breach
  g.bricks = Array.from({ length: 19 }, () => Array(16).fill(0));
  g.bricks.push(Array.from({ length: 16 }, (_, i) => (i === 0 ? 1 : 0)));
  fallBricks(g);
  assert.equal(g.dead, true);
  assert.equal(g.deadReason, 'bricks');
});
```

Invariant: after the shift, any live brick with row index ≥ `Math.floor(PADDLE_Y / CELL)` (= 19) ⇒ dead.

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test test/bounce.test.js`
Expected: FAIL (`fallMs` undefined / `fallBricks` not exported)

- [ ] **Step 3: Implement**

Add `fallMs` to the six LEVELS entries (0, 0, 5000, 4000, 3000, 2200). Export:

```js
export function fallBricks(state) {
  if (state.dead || state.cleared) return;
  const cols = state.bricks[0].length;
  state.bricks.unshift(Array(cols).fill(0));
  const breachRow = Math.floor(PADDLE_Y / CELL);
  for (let r = 0; r < state.bricks.length; r++) {
    if (r >= breachRow && state.bricks[r].some((v) => v > 0)) {
      state.dead = true;
      state.deadReason = 'bricks';
      return;
    }
  }
}
```

(`createGame` gains `deadReason: null` for a clean initial state.)

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test test/*.test.js`
Expected: all PASS (old + new)

- [ ] **Step 5: Commit**

```bash
git add games/bounce.js test/bounce.test.js
git commit -m "feat: bounce brick descent with per-level fallMs and bottom breach"
```

---

### Task 2: Multi-ball refactor — `state.balls[]` + `splitBalls()`

**Files:**
- Modify: `games/bounce.js` (`createGame`, `step`, `resetBall`, mount `draw`/`tick`)
- Modify: `test/bounce.test.js` (six existing tests assign `g.ball` — update them)
- Test: `test/bounce.test.js` (new)

**Interfaces:**
- Consumes: Task 1's `state.dead`/`deadReason` (balls-loss uses `deadReason: 'balls'`).
- Produces: `state.balls: {x,y,dx,dy}[]` (replaces `state.ball` — no other reference may remain; grep `\.ball\b` after); `export function splitBalls(state): void` — when `state.balls.length === 1`, pushes two clones of `balls[0]` (one with `dx` negated, one with `dx: 0`), total 3, no-op otherwise.

- [ ] **Step 1: Write the failing tests**

```js
test('splitBalls turns one ball into three', () => {
  const g = createGame(singleBrick);
  splitBalls(g);
  assert.equal(g.balls.length, 3);
  splitBalls(g);
  assert.equal(g.balls.length, 3); // no stacking beyond the rule
});

test('losing one of three balls costs no life', () => {
  const g = createGame(singleBrick);
  g.lives = 3;
  g.balls = [
    { x: 10, y: H + 10, dx: 0, dy: 2 }, // falls off
    { x: 160, y: 100, dx: 2, dy: -2 },  // survives
    { x: 200, y: 100, dx: -2, dy: -2 }, // survives
  ];
  step(g);
  assert.equal(g.balls.length, 2);
  assert.equal(g.lives, 3);
  assert.equal(g.dead, false);
});

test('losing all balls costs a life and respawns', () => {
  const g = createGame(singleBrick);
  g.lives = 2;
  g.balls = [{ x: 160, y: H + 10, dx: 0, dy: 2 }];
  step(g);
  assert.equal(g.lives, 1);
  assert.equal(g.dead, false);
  assert.equal(g.balls.length, 1);
});

test('last life lost with all balls gone is dead', () => {
  const g = createGame(singleBrick);
  g.lives = 1;
  g.balls = [{ x: 160, y: H + 10, dx: 0, dy: 2 }];
  step(g);
  assert.equal(g.dead, true);
  assert.equal(g.deadReason, 'balls');
  assert.equal(g.lives, 0);
});
```

- [ ] **Step 2: Update the six existing `g.ball` tests**

Replace every `g.ball = { … }` with `g.balls = [{ … }]` (lines ~9, ~15, ~22, ~29, ~39, ~80 of `test/bounce.test.js`).

- [ ] **Step 3: Run tests to verify they fail**

Run: `node --test test/bounce.test.js`
Expected: FAIL (new tests reference `g.balls`/`splitBalls` which don't exist yet; old tests fail after Step 2 until Step 4)

- [ ] **Step 4: Implement**

- `createGame`: `balls: [{ x: W / 2, y: H - 60, dx: level.ballSpeed, dy: -level.ballSpeed }]`; drop the `ball` key.
- `resetBall(state)`: pushes/replaces with a single ball at paddle x (used on life loss).
- `step(state)`: iterate `state.balls`; per ball do today's wall/brick/paddle logic; remove balls with `y - BALL_R > H`. After the loop: if `balls.length === 0` → `lives -= 1`; if `lives <= 0` → `dead = true; deadReason = 'balls'`; else `resetBall(state)`. Brick-hit bounce applies per ball (first ball to hit a brick wins that tick is fine).
- `splitBalls(state)` per Interfaces; export it.
- Mount `draw()`: loop `state.balls` for the red circles; mount `tick`/`showOverlay` title: `state.deadReason === 'bricks' ? 'Bricks reached the bottom' : 'Game Over'`.

- [ ] **Step 5: Run full suite**

Run: `node --test test/*.test.js`
Expected: all PASS

- [ ] **Step 6: Commit**

```bash
git add games/bounce.js test/bounce.test.js
git commit -m "feat: bounce multi-ball with per-ball step and life rules"
```

---

### Task 3: Skill drops — spawn, fall, catch, effects

**Files:**
- Modify: `games/bounce.js` (`createGame`, `hitBrick`, new exports, `step` timers)
- Test: `test/bounce.test.js`

**Interfaces:**
- Consumes: Task 2's `state.balls` / `splitBalls`.
- Produces:
  - `export const DROP_TYPES = ['wide', 'multi', 'slow', 'extra']`
  - `export function dropType(rng): string` — uniform pick from `DROP_TYPES`
  - `createGame(level, rng = Math.random)` — stores `state.rng`
  - `state.drops: {x,y,type}[]`, `state.timers: {wide: 0, slow: 0}` (tick counts)
  - `hitBrick` spawns: when a brick reaches 0 and `state.rng() < 0.25`, push `{x: col*CELL + CELL/2, y: row*CELL + CELL/2, type: dropType(state.rng)}`
  - `export function fallDrops(state): void` — `y += 1.5`; catch on paddle-rect overlap applies effect then removes; `y > H` removes; effects: `wide → timers.wide = 625`, `slow → timers.slow = 500`, `multi → splitBalls(state)`, `extra → lives += 1`
  - `step` each tick: `timers.wide/slow` decrement (floor 0); `paddle.w = timers.wide > 0 ? 80 : PADDLE_W` then re-clamp `paddle.x`; ball integration uses `dx * (timers.slow > 0 ? 0.6 : 1)` **without writing the factor into `dx`/`dy`**.

- [ ] **Step 1: Write the failing tests**

```js
test('dropType only returns known skill types', () => {
  const r = () => 0;
  assert.equal(dropType(r), 'wide');
  const r2 = () => 0.99;
  assert.ok(DROP_TYPES.includes(dropType(r2)));
});

test('destroying a brick may spawn a drop (seeded rng)', () => {
  const rng = () => 0; // < 0.25 always, and picks index 0 → 'wide'
  const g = createGame(singleBrick, rng);
  g.balls = [{ x: 10, y: 10, dx: 0, dy: 2 }];
  step(g); // destroys the brick
  assert.equal(g.drops.length, 1);
  assert.equal(g.drops[0].type, 'wide');
});

test('rng >= 0.25 never spawns', () => {
  const g = createGame(singleBrick, () => 0.5);
  g.balls = [{ x: 10, y: 10, dx: 0, dy: 2 }];
  step(g);
  assert.equal(g.drops.length, 0);
});

test('catching wide widens the paddle, expiry restores it', () => {
  const g = createGame(singleBrick);
  g.drops = [{ x: g.paddle.x, y: PADDLE_Y, type: 'wide' }];
  fallDrops(g);
  assert.equal(g.timers.wide, 625);
  assert.equal(g.paddle.w, 80); // effective width visible after step
  g.timers.wide = 1;
  step(g);
  assert.equal(g.timers.wide, 0);
  assert.equal(g.paddle.w, PADDLE_W);
});

test('wide expiry re-clamps paddle', () => {
  const g = createGame(singleBrick);
  setPaddleX(g, W - 30);       // valid for w=48
  g.timers.wide = 1;
  g.drops = [{ x: g.paddle.x, y: PADDLE_Y, type: 'wide' }];
  fallDrops(g);                // w becomes 80; x must be ≤ W-40
  step(g);                     // wide expires this tick → w=48, x re-clamped
  step(g);
  assert.ok(g.paddle.x >= g.paddle.w / 2 && g.paddle.x <= W - g.paddle.w / 2);
});

test('slow factor leaves dx unchanged', () => {
  const g = createGame(singleBrick);
  const before = g.balls[0].dx;
  g.timers.slow = 500;
  step(g);
  assert.equal(g.balls[0].dx, before);
  assert.equal(g.timers.slow, 499);
});

test('extra life applies immediately', () => {
  const g = createGame(singleBrick);
  g.lives = 3;
  g.drops = [{ x: g.paddle.x, y: PADDLE_Y, type: 'extra' }];
  fallDrops(g);
  assert.equal(g.lives, 4);
  assert.equal(g.drops.length, 0);
});

test('missed drop falls off and is discarded', () => {
  const g = createGame(singleBrick);
  g.drops = [{ x: 10, y: H + 1, type: 'extra' }];
  fallDrops(g);
  assert.equal(g.drops.length, 0);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test test/bounce.test.js`
Expected: FAIL (`dropType`/`fallDrops` not exported, `rng` param missing)

- [ ] **Step 3: Implement**

Per Interfaces. Colors/glyphs for Task 4 draw — here only logic. `createGame(level, rng = Math.random)` keeps backward compat (existing tests call `createGame(level)`).

- [ ] **Step 4: Run full suite**

Run: `node --test test/*.test.js`
Expected: all PASS

- [ ] **Step 5: Commit**

```bash
git add games/bounce.js test/bounce.test.js
git commit -m "feat: bounce skill drops with wide/multi/slow/extra effects"
```

---

### Task 4: Mount wiring — fall timer, drop rendering, overlay title

**Files:**
- Modify: `games/bounce.js` (`mount` only: `tick`, `draw`)

**Interfaces:**
- Consumes: `fallBricks`, `fallDrops` (Tasks 1, 3), `state.deadReason` (Task 2).
- Produces: playable behavior — no new exports.

- [ ] **Step 1: Implement mount changes**

In `tick()`, after the `paused || dead || cleared` guard and before/after `step(state)` (order: `step` first, then `fallDrops(state)`, then fall accumulation):

```js
fallAcc += 16;
if (level.fallMs > 0 && fallAcc >= level.fallMs) {
  fallAcc = 0;
  fallBricks(state);
}
fallDrops(state);
```

(`fallAcc` is a local `let fallAcc = 0`, reset in `restart()`.)

In `draw()`, after bricks: render each drop as an 16×16 square centered at `(x-8, y-8)` with letter glyph — wide `#39ff88`/`W`, multi `#ffd23f`/`M`, slow `#55aaff`/`S`, extra `#ff5566`/`♥` (fillText centered, `ctx.fillStyle = '#0a0a12'`).

Overlay title already handled in Task 2's `showOverlay` call site — verify it reads `state.deadReason`.

- [ ] **Step 2: Run full suite**

Run: `node --test test/*.test.js`
Expected: all PASS

- [ ] **Step 3: Run smoke**

Start `python3 -m http.server 8000` (background) if not running, then:

Run: `/snap/bin/chromium --headless --no-sandbox --disable-gpu --window-size=800,600 --virtual-time-budget=25000 --dump-dom http://localhost:8000/test/smoke.html`
Expected: `#result` contains 36 OK steps, zero FAIL/THROW (bounce steps must still pass — level 1 has `fallMs: 0`, title stays `Game Over`).

- [ ] **Step 4: Commit**

```bash
git add games/bounce.js
git commit -m "feat: wire bounce fall timer and skill drop rendering"
```

---

### Task 5: Descent + breach smoke coverage, final verification

**Files:**
- Modify: `test/smoke.html` (one block after `bounce alive after ticks`)

**Interfaces:**
- Consumes: Task 4's wired mount.

- [ ] **Step 1: Add smoke steps**

After the bounce touch-drag step, still inside bounce level 1 (or re-entering level 1):

```js
// level 1 never falls; a fabricated fall must not crash the render loop
step('bounce level1 is static config', true); // asserted in unit tests; smoke guards the loop
```

Prefer instead a real assertion if cheap: navigate out, `setUnlockedLevel('bounce', 4)` is not needed — level 4 is locked. Simplest meaningful smoke addition: none beyond keeping the existing 36 green, **unless** a unit regression is suspected. Decision: **skip new smoke steps** (unit tests own fall/catch/breach; smoke owns the journey). Update this task to "final verification" only.

- [ ] **Step 2: Full verification**

Run: `node --test test/*.test.js` → all PASS (expect ≥ 40 tests)
Run smoke → 36/36 OK
Run: `grep -n "\.ball\b" games/bounce.js` → no hits (only `balls`)

- [ ] **Step 3: Commit (if any leftover changes)**

```bash
git add -A
git commit -m "test: verify bounce descent and skills suite"
```

Only if the tree is dirty; otherwise skip the commit.
