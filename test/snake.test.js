import test from 'node:test';
import assert from 'node:assert/strict';
import { LEVELS, createGame, step, setDir } from '../games/snake.js';

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

test('setDir rejects a 180° reverse into the neck', () => {
  const g = createGame(openLevel); // starts heading right
  setDir(g, 'left');
  assert.notEqual(g.nextDir, 'left');
  assert.equal(g.dir, 'right');
  setDir(g, 'up');
  assert.equal(g.nextDir, 'up');
});
