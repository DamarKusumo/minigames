import test from 'node:test';
import assert from 'node:assert/strict';
import { LEVELS, createGame, step, setDir, swipeDir, cellSizeFor } from '../games/snake.js';

const openLevel = { id: 0, label: 'test', target: 2, speedMs: 50, maze: ['....', '....', '....', '....'] };

test('snake grows and score increments when head reaches food', () => {
  const g = createGame(openLevel);
  const head = g.snake[0];
  g.food = { x: head.x + 1, y: head.y };
  const len = g.snake.length;
  step(g);
  assert.equal(g.score, 1);
  assert.equal(g.snake.length, len + 1);
  assert.equal(g.dead, false);
});

test('head hitting the grid edge dies (LEVELS[0] open maze)', () => {
  const g = createGame(LEVELS[0]);
  g.snake = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }];
  g.dir = 'up';
  g.nextDir = 'up';
  step(g);
  assert.equal(g.dead, true);
});

test('head hitting own body dies', () => {
  const g = createGame(openLevel);
  g.snake = [{ x: 1, y: 1 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 2, y: 1 }, { x: 2, y: 2 }];
  g.dir = 'up';
  g.nextDir = 'up';
  g.food = { x: 0, y: 3 };
  step(g);
  assert.equal(g.dead, true);
});

test('reaching target sets cleared once, later steps leave state untouched', () => {
  const g = createGame({ ...openLevel, target: 1 });
  const head = g.snake[0];
  g.food = { x: head.x + 1, y: head.y };
  step(g);
  assert.equal(g.score, 1);
  assert.equal(g.cleared, true);
  assert.equal(g.dead, false);
  const snapshot = JSON.stringify(g);
  step(g);
  assert.equal(JSON.stringify(g), snapshot);
  assert.equal(g.cleared, true);
});

test('swipeDir maps a dominant axis to a direction, ignores tiny swipes', () => {
  assert.equal(swipeDir(30, 5), 'right');
  assert.equal(swipeDir(-40, 8), 'left');
  assert.equal(swipeDir(6, 35), 'down');
  assert.equal(swipeDir(4, -30), 'up');
  assert.equal(swipeDir(8, 6), null); // below threshold
  assert.equal(swipeDir(0, 0), null);
});

test('vault: food never spawns outside the box when the snake starts inside', () => {
  const vault = LEVELS.find((l) => l.id === 5);
  for (let i = 0; i < 25; i++) {
    const g = createGame(vault);
    // exterior = free cells reachable from the top-left corner (independent flood fill)
    const ext = new Set();
    const queue = [{ x: 0, y: 0 }];
    while (queue.length) {
      const { x, y } = queue.pop();
      const key = `${x},${y}`;
      if (ext.has(key)) continue;
      if (x < 0 || y < 0 || x >= g.cols || y >= g.rows || g.walls.has(key)) continue;
      ext.add(key);
      queue.push({ x: x + 1, y }, { x: x - 1, y }, { x, y: y + 1 }, { x, y: y - 1 });
    }
    const foodKey = `${g.food.x},${g.food.y}`;
    assert.ok(!ext.has(foodKey), `food spawned in unreachable exterior cell ${foodKey}`);
  }
});

test('cellSizeFor fits the available playfield on both axes', () => {
  const s1 = cellSizeFor(1440, 1000, 16, 12);
  assert.equal(s1, 34); // growth capped
  const s2 = cellSizeFor(300, 200, 16, 12);
  assert.ok(s2 * 16 <= 300, 'fits width');
  assert.ok(s2 * 12 <= 200, 'fits height');
  assert.equal(cellSizeFor(60, 30, 16, 12), 14); // never unplayable small
});

test('setDir rejects a 180° reverse into the neck', () => {
  const g = createGame(openLevel); // starts heading right
  setDir(g, 'left');
  assert.notEqual(g.nextDir, 'left');
  assert.equal(g.dir, 'right');
  setDir(g, 'up');
  assert.equal(g.nextDir, 'up');
});
