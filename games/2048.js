export function createGame() {
  const state = { board: Array(16).fill(0), score: 0, dead: false };
  spawn(state);
  spawn(state);
  return state;
}

function spawn(state) {
  const empties = [];
  for (let i = 0; i < 16; i++) if (state.board[i] === 0) empties.push(i);
  if (!empties.length) return;
  const cell = empties[(Math.random() * empties.length) | 0];
  state.board[cell] = Math.random() < 0.9 ? 2 : 4;
}

// Extract one line of 4 indices in movement order (first index = merge target side).
function lineIndices(line, dir) {
  if (dir === 'left' || dir === 'right') {
    const base = line * 4;
    const idx = [base, base + 1, base + 2, base + 3];
    return dir === 'left' ? idx : idx.reverse();
  }
  const idx = [line, line + 4, line + 8, line + 12];
  return dir === 'up' ? idx : idx.reverse();
}

// Compact nonzeros, merge equal adjacent pairs once each. Returns gained score.
function mergeLine(values) {
  const nonzero = values.filter((v) => v !== 0);
  const out = [];
  let gained = 0;
  for (let i = 0; i < nonzero.length; i++) {
    if (nonzero[i] === nonzero[i + 1]) {
      out.push(nonzero[i] * 2);
      gained += nonzero[i] * 2; // score += merged tile value (spec: design.md:85)
      i++;
    } else {
      out.push(nonzero[i]);
    }
  }
  while (out.length < 4) out.push(0);
  return { out, gained };
}

export function move(state, dir) {
  const before = state.board.slice();
  let gained = 0;
  for (let line = 0; line < 4; line++) {
    const idx = lineIndices(line, dir);
    const { out, gained: g } = mergeLine(idx.map((i) => state.board[i]));
    gained += g;
    idx.forEach((cell, j) => { state.board[cell] = out[j]; });
  }
  const changed = state.board.some((v, i) => v !== before[i]);
  if (!changed) return false;
  state.score += gained;
  spawn(state);
  return true;
}

export function canMove(state) {
  const b = state.board;
  for (let i = 0; i < 16; i++) {
    if (b[i] === 0) return true;
    const r = (i / 4) | 0;
    const c = i % 4;
    if (c < 3 && b[i] === b[i + 1]) return true;
    if (r < 3 && b[i] === b[i + 4]) return true;
  }
  return false;
}

export default {
  id: '2048',
  name: '2048',
  icon: '🔢',
  blurb: 'Slide and merge tiles to reach 2048 — and keep going',
  freeChoice: true,
  levels: [{ id: 1, label: 'Marathon' }],
  mount() {
    throw new Error('mount in task 2');
  },
};
