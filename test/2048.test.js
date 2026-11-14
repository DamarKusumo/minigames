import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, move, canMove } from '../games/2048.js';

function fromRows(rows) { // helper: rows of 4 → state (no spawn)
  return { board: rows.flat(), score: 0, dead: false };
}

test('slide left merges a pair once', () => {
  const g = fromRows([[2, 2, 4, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]);
  const changed = move(g, 'left');
  assert.equal(changed, true);
  assert.equal(g.board[0], 4);
  assert.equal(g.board[1], 4); // 4+4 must NOT merge again
  assert.equal(g.score, 4); // 2+2 merge scores merged value 4 (spec)
});

test('two pairs in one row do not chain-merge', () => {
  const g = fromRows([[2, 2, 2, 2], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]);
  move(g, 'left');
  // spawn may land at index 2/3, so assert only spawn-immune facts:
  // front pair is [4,4] and no chain-merged 8 exists (spawn is only 2 or 4)
  assert.deepEqual(g.board.slice(0, 2), [4, 4]);
  assert.ok(!g.board.includes(8));
});

test('no-op move does not change board or spawn', () => {
  const g = fromRows([[2, 4, 8, 16], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]);
  const before = g.board.slice();
  const changed = move(g, 'left');
  assert.equal(changed, false);
  assert.deepEqual(g.board, before);
});

test('successful move spawns exactly one 2 or 4 on an empty cell', () => {
  const g = fromRows([[2, 2, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]);
  move(g, 'left');
  assert.equal(g.board[0], 4);
  const rest = g.board.slice(1).filter(v => v !== 0);
  assert.equal(rest.length, 1);
  assert.ok(rest[0] === 2 || rest[0] === 4);
});

test('canMove false when full and no adjacent equals', () => {
  const g = fromRows([
    [2, 4, 2, 4],
    [4, 2, 4, 2],
    [2, 4, 2, 4],
    [4, 2, 4, 2],
  ]);
  assert.equal(canMove(g), false);
});

test('canMove true when an adjacent pair exists', () => {
  const g = fromRows([
    [2, 2, 4, 8],
    [4, 8, 16, 32],
    [8, 16, 32, 64],
    [16, 32, 64, 128],
  ]);
  assert.equal(canMove(g), true);
});
