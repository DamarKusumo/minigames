import test from 'node:test';
import assert from 'node:assert/strict';
import { LEVELS, createGame, step, movePaddle, W, H, PADDLE_W, PADDLE_Y } from '../games/bounce.js';

const singleBrick = { id: 99, label: 'test', ballSpeed: 2, paddleSpeed: 5, bricks: ['1...............'] };
const singleTwo = { id: 98, label: 'test', ballSpeed: 2, paddleSpeed: 5, bricks: ['2...............'] };

test('ball bouncing off top wall reverses dy', () => {
  const g = createGame(singleBrick);
  g.ball = { x: 160, y: 2, dx: 0, dy: -2 };
  step(g);
  assert.ok(g.ball.dy > 0, `dy should be upward, got ${g.ball.dy}`);
});

test('paddle hit sends the ball upward, not downward', () => {
  const g = createGame(singleBrick);
  g.ball = { x: g.paddle.x, y: PADDLE_Y + 1, dx: 0, dy: 2 };
  step(g);
  assert.ok(g.ball.dy < 0, `dy should be negative, got ${g.ball.dy}`);
});

test('1-hit brick is removed and score increments', () => {
  const g = createGame(singleBrick);
  g.ball = { x: 10, y: 10, dx: 0, dy: 2 };
  step(g);
  assert.equal(g.bricks[0][0], 0);
  assert.equal(g.score, 1);
});

test('2-hit brick decrements to 1 and score increments', () => {
  const g = createGame(singleTwo);
  g.ball = { x: 10, y: 10, dx: 0, dy: 2 };
  step(g);
  assert.equal(g.bricks[0][0], 1);
  assert.equal(g.score, 1);
  assert.equal(g.cleared, false);
});

test('last brick removed sets cleared once, later steps leave state untouched', () => {
  const g = createGame(singleBrick);
  g.ball = { x: 10, y: 10, dx: 0, dy: 2 };
  step(g);
  assert.equal(g.cleared, true);
  assert.equal(g.dead, false);
  const snapshot = JSON.stringify(g);
  step(g);
  assert.equal(JSON.stringify(g), snapshot);
  assert.equal(g.cleared, true);
});

test('paddle clamps at both edges', () => {
  const g = createGame(LEVELS[0]);
  for (let i = 0; i < 100; i++) movePaddle(g, -1);
  const left = g.paddle.x;
  assert.equal(left, PADDLE_W / 2);
  for (let i = 0; i < 200; i++) movePaddle(g, 1);
  const right = g.paddle.x;
  assert.equal(right, W - PADDLE_W / 2);
  assert.ok(left < right);
});

test('ball below bottom with 0 lives left is dead', () => {
  const g = createGame(singleBrick);
  g.lives = 1;
  g.ball = { x: 160, y: H + 10, dx: 0, dy: 2 };
  step(g);
  assert.equal(g.dead, true);
  assert.equal(g.lives, 0);
});
