import test from 'node:test';
import assert from 'node:assert/strict';
import { LEVELS, createGame, step, movePaddle, setPaddleX, fitScale, fallBricks, splitBalls, W, H, PADDLE_W, PADDLE_Y } from '../games/bounce.js';

const singleBrick = { id: 99, label: 'test', ballSpeed: 2, paddleSpeed: 5, bricks: ['1...............'] };
const singleTwo = { id: 98, label: 'test', ballSpeed: 2, paddleSpeed: 5, bricks: ['2...............'] };

test('ball bouncing off top wall reverses dy', () => {
  const g = createGame(singleBrick);
  g.balls = [{ x: 160, y: 2, dx: 0, dy: -2 }];
  step(g);
  assert.ok(g.balls[0].dy > 0, `dy should be upward, got ${g.balls[0].dy}`);
});

test('paddle hit sends the ball upward, not downward', () => {
  const g = createGame(singleBrick);
  g.balls = [{ x: g.paddle.x, y: PADDLE_Y + 1, dx: 0, dy: 2 }];
  step(g);
  assert.ok(g.balls[0].dy < 0, `dy should be negative, got ${g.balls[0].dy}`);
});

test('1-hit brick is removed and score increments', () => {
  const g = createGame(singleBrick);
  g.balls = [{ x: 10, y: 10, dx: 0, dy: 2 }];
  step(g);
  assert.equal(g.bricks[0][0], 0);
  assert.equal(g.score, 1);
});

test('2-hit brick decrements to 1 and score increments', () => {
  const g = createGame(singleTwo);
  g.balls = [{ x: 10, y: 10, dx: 0, dy: 2 }];
  step(g);
  assert.equal(g.bricks[0][0], 1);
  assert.equal(g.score, 1);
  assert.equal(g.cleared, false);
});

test('last brick removed sets cleared once, later steps leave state untouched', () => {
  const g = createGame(singleBrick);
  g.balls = [{ x: 10, y: 10, dx: 0, dy: 2 }];
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

test('fitScale keeps the whole board inside the available space', () => {
  assert.ok(fitScale(W, H) <= 1.0001); // exactly fits, no more
  const s = fitScale(200, 500);
  assert.ok(W * s <= 200 + 0.5, 'width fits');
  assert.ok(H * s <= 500 + 0.5, 'height fits');
  assert.equal(fitScale(4000, 4000), 1.75); // desktop growth cap
});

test('setPaddleX clamps to field edges (touch drag)', () => {
  const g = createGame(LEVELS[0]);
  setPaddleX(g, -50);
  assert.equal(g.paddle.x, PADDLE_W / 2);
  setPaddleX(g, 9999);
  assert.equal(g.paddle.x, W - PADDLE_W / 2);
  setPaddleX(g, 100);
  assert.equal(g.paddle.x, 100);
});

test('ball below bottom with 0 lives left is dead', () => {
  const g = createGame(singleBrick);
  g.lives = 1;
  g.balls = [{ x: 160, y: H + 10, dx: 0, dy: 2 }];
  step(g);
  assert.equal(g.dead, true);
  assert.equal(g.lives, 0);
});

test('levels 1-2 never fall, 3-6 fall with faster intervals', () => {
  assert.deepEqual(LEVELS.map((l) => l.fallMs), [0, 0, 5000, 4000, 3000, 2200]);
});

test('fallBricks shifts the formation down one row', () => {
  const g = createGame(singleBrick);
  fallBricks(g);
  assert.equal(g.bricks[0].every((v) => v === 0), true);
  assert.equal(g.bricks[1][0], 1);
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
  g.bricks = Array.from({ length: 19 }, () => Array(16).fill(0));
  g.bricks.push(Array.from({ length: 16 }, (_, i) => (i === 0 ? 1 : 0)));
  fallBricks(g);
  assert.equal(g.dead, true);
  assert.equal(g.deadReason, 'bricks');
});

test('splitBalls turns one ball into three', () => {
  const g = createGame(singleBrick);
  splitBalls(g);
  assert.equal(g.balls.length, 3);
  splitBalls(g);
  assert.equal(g.balls.length, 3);
});

test('losing one of three balls costs no life', () => {
  const g = createGame(singleBrick);
  g.lives = 3;
  g.balls = [
    { x: 10, y: H + 10, dx: 0, dy: 2 },
    { x: 160, y: 100, dx: 2, dy: -2 },
    { x: 200, y: 100, dx: -2, dy: -2 },
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
