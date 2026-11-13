import test from 'node:test';
import assert from 'node:assert/strict';
import { SUDOKU_LEVELS, generateSudoku, solveCount, solve, isValidPlacement } from '../games/sudoku.js';

function seeded(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function assertValidFullGrid(grid) {
  const unit = (idxs) => {
    const seen = new Set();
    for (const i of idxs) {
      assert.ok(grid[i] >= 1 && grid[i] <= 9, `cell ${i} out of range`);
      assert.ok(!seen.has(grid[i]), `duplicate ${grid[i]} in unit`);
      seen.add(grid[i]);
    }
  };
  for (let r = 0; r < 9; r++) unit([...Array(9)].map((_, c) => r * 9 + c));
  for (let c = 0; c < 9; c++) unit([...Array(9)].map((_, r) => r * 9 + c));
  for (let br = 0; br < 3; br++) {
    for (let bc = 0; bc < 3; bc++) {
      const idxs = [];
      for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) idxs.push((br * 3 + r) * 9 + (bc * 3 + c));
      unit(idxs);
    }
  }
}

test('solution has no duplicate in any row, col, or box', () => {
  for (const { holes } of SUDOKU_LEVELS) {
    const { solution } = generateSudoku(holes, seeded(7));
    assertValidFullGrid(solution);
  }
});

test('puzzle keeps exactly holes nulls and matches solution elsewhere', () => {
  for (const { holes } of SUDOKU_LEVELS) {
    const { puzzle, solution } = generateSudoku(holes, seeded(11));
    const nulls = puzzle.filter((v) => v === null).length;
    assert.equal(nulls, holes);
    puzzle.forEach((v, i) => {
      if (v !== null) assert.equal(v, solution[i]);
    });
  }
});

test('generated puzzles have a unique solution at every difficulty', () => {
  for (const { holes } of SUDOKU_LEVELS) {
    for (const seed of [3, 99]) {
      const { puzzle } = generateSudoku(holes, seeded(seed));
      assert.equal(solveCount(puzzle), 1, `holes=${holes} seed=${seed}`);
    }
  }
});

test('solve fills a generated puzzle to a valid complete grid', () => {
  const { puzzle } = generateSudoku(45, seeded(5));
  const solved = solve(puzzle);
  assert.ok(solved);
  assertValidFullGrid(solved);
  solved.forEach((v, i) => {
    if (puzzle[i] !== null) assert.equal(v, puzzle[i]);
  });
});

test('isValidPlacement rejects a value already in the row', () => {
  const grid = Array(81).fill(null);
  grid[0] = 5;
  assert.equal(isValidPlacement(grid, 1, 5), false);
  assert.equal(isValidPlacement(grid, 1, 7), true);
});
