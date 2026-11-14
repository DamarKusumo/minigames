# Bounce enhancement: power-ups + descending bricks

Date: 2026-11-14 · Status: awaiting approval

## Intent

Make Bounce feel like the retro downfall-style games the user remembers: broken bricks drop **skills** (power-ups), and from mid-game onward the brick formation **descends**, threatening to reach the bottom. If a live brick reaches the paddle line before the level is cleared → Game Over.

## Goals

- Skills drop from broken bricks and are caught with the paddle.
- Levels 1–2 stay static (tutorial). Levels 3+ bricks fall, one row per interval, **interval set per level** (higher level → faster fall).
- Reaching the bottom with bricks still alive = fail, regardless of lives.
- Fits existing architecture: one file (`games/bounce.js`), pure `step()` logic testable under `node --test`, no new deps.

## Non-goals

- No new games, no sound, no backend, no config files.
- No change to Snake/Sudoku, level-select, or storage schema.

## Approaches (descent trigger)

| | How it falls | Verdict |
|---|---|---|
| A | continuous on a timer for all levels | rejected — no learning curve |
| B | falls every N bricks broken | rejected — unpredictable |
| **C** | levels 3+ fall on a per-level timer | **chosen** — gentle start, difficulty scales with level |

## Design

### Level config

Each level gains `fallMs` (0 = never falls):

| Level | fallMs |
|---|---|
| 1–2 | 0 |
| 3 | 5000 |
| 4 | 4000 |
| 5 | 3000 |
| 6 | 2200 |

Every `fallMs` (in `tick`): shift `bricks` down one row (prepend empty row). If any non-empty brick now sits in the paddle row (`y >= PADDLE_Y`, i.e. row ≥ 19) → `state.dead = true` with a distinct overlay title (`Bricks reached the bottom`). Cleared check runs before the fall check — clearing on the last moment still wins.

### Skills

- On brick destruction: 1-in-4 chance to spawn a drop at that brick's position.
- Drop falls ~1.5px/tick; caught when its rect overlaps the paddle rect; missed drops fall off the bottom harmlessly.
- Types (random): **Wide** (paddle 48→80px, 10s), **Multi** (split into 3 balls, 10s), **Slow** (ball speed ×0.6, 8s), **Extra** (+1 life, instant).
- Drawn as a colored square with a letter glyph (W/M/S/♥) on the existing canvas — no DOM elements.

### Multi-ball refactor (needed for the Multi skill)

`state.ball` becomes `state.balls[]`. `step`/`draw`/paddle-bounce iterate balls; a ball below the bottom is removed (no life lost); life lost only when **all** balls are gone; extra balls don't trigger the lose overlay individually. `hitBrick` runs per ball (a ball that hits a brick just bounces).

### Failure / overlay

Two Game Over titles: `Game Over` (all balls lost) and `Bricks reached the bottom`. Both offer Restart / Choose Level, as today.

### Tests (TDD)

- `fallMs` respected: with `fallMs: 100`, after enough ticks a full top row has moved down; static level never shifts.
- Bottom breach sets `dead` before the row would overlap the paddle.
- Skill spawn: destroying a brick either spawns or doesn't (seeded rng), type set is one of the four.
- Catch: drop overlapping paddle applies effect (wide widens, extra +1 life); missed drop is discarded.
- Multi-ball: split yields 3 balls; losing 2 keeps playing; losing all sets `dead`.
- Existing bounce tests (fitScale, setPaddleX, brick strings) keep passing; smoke journey updated if Game Over title flow changes.

## What's left to the builder

Exact tick math for drop fall speed and effect countdown timers (any values that feel right in the ranges above), canvas glyph rendering, wiring the per-level fall accumulator in `tick`.
