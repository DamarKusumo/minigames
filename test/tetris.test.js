// test/tetris.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  COLS, ROWS, SHAPES, createGame, move, rotate, step, hardDrop, spawn, clearLines,
} from '../games/tetris.js';

function emptyGrid() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(0));
}
function place(g, type, rot, x, y) {
  g.piece = { type, rot, x, y };
}

test('move blocked by left wall returns false and does not shift', () => {
  const g = createGame();
  g.grid = emptyGrid();
  place(g, 'O', 0, 0, 5);
  assert.equal(move(g, -1), false);
  assert.equal(g.piece.x, 0);
});

test('rotate returns false when the new cells would collide', () => {
  const g = createGame();
  g.grid = emptyGrid();
  // I horizontal resting on the floor; rotating to vertical would go below ROWS
  place(g, 'I', 0, 3, ROWS - 1);
  assert.equal(rotate(g), false);
});

test('step locks a floor-rested piece into the grid', () => {
  const g = createGame();
  g.grid = emptyGrid();
  const y = ROWS - 2; // O occupies dy 0 and 1
  place(g, 'O', 0, 4, y);
  step(g); // blocked below → lock + spawn next
  for (const c of SHAPES.O[0]) {
    assert.ok(g.grid[y + c.y][4 + c.x] !== 0, `locked at ${c.x},${c.y}`);
  }
  assert.notEqual(g.piece, null);
  assert.equal(g.dead, false);
});

test('clearLines removes a full row, shifts marker, score +100', () => {
  const g = createGame();
  g.grid = emptyGrid();
  g.score = 0;
  g.lines = 0;
  for (let x = 0; x < COLS; x++) g.grid[ROWS - 1][x] = 1;
  g.grid[ROWS - 2][3] = 7;
  const cleared = clearLines(g);
  assert.equal(cleared, 1);
  assert.equal(g.lines, 1);
  assert.equal(g.score, 100);
  assert.equal(g.grid[ROWS - 1][3], 7);
  assert.equal(g.grid[ROWS - 2][3], 0);
});

test('spawn into filled cells sets dead', () => {
  const g = createGame();
  g.grid = emptyGrid();
  for (let y = 0; y < 4; y++) for (let x = 0; x < COLS; x++) g.grid[y][x] = 1;
  g.next = 'T';
  assert.equal(spawn(g), false);
  assert.equal(g.dead, true);
});

test('hardDrop returns rows fallen and leaves piece locked on floor', () => {
  const g = createGame();
  g.grid = emptyGrid();
  place(g, 'O', 0, 4, 0);
  const dropped = hardDrop(g);
  assert.ok(dropped > 0);
  assert.ok(g.grid[ROWS - 1][4] !== 0 && g.grid[ROWS - 1][5] !== 0);
});
