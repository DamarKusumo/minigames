export const COLS = 10;
export const ROWS = 20;

const TYPES = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];

// type → rot → cell offsets [{x,y}]; O/I repeat rots (allowed by spec)
const c = (x, y) => ({ x, y });
export const SHAPES = {
  I: [
    [c(0, 0), c(1, 0), c(2, 0), c(3, 0)],
    [c(0, 0), c(0, 1), c(0, 2), c(0, 3)],
    [c(0, 0), c(1, 0), c(2, 0), c(3, 0)],
    [c(0, 0), c(0, 1), c(0, 2), c(0, 3)],
  ],
  O: [
    [c(0, 0), c(1, 0), c(0, 1), c(1, 1)],
    [c(0, 0), c(1, 0), c(0, 1), c(1, 1)],
    [c(0, 0), c(1, 0), c(0, 1), c(1, 1)],
    [c(0, 0), c(1, 0), c(0, 1), c(1, 1)],
  ],
  T: [
    [c(0, 0), c(1, 0), c(2, 0), c(1, 1)],
    [c(1, 0), c(0, 1), c(1, 1), c(1, 2)],
    [c(1, 0), c(0, 1), c(1, 1), c(2, 1)],
    [c(0, 0), c(0, 1), c(1, 1), c(0, 2)],
  ],
  S: [
    [c(1, 0), c(2, 0), c(0, 1), c(1, 1)],
    [c(0, 0), c(0, 1), c(1, 1), c(1, 2)],
    [c(1, 0), c(2, 0), c(0, 1), c(1, 1)],
    [c(0, 0), c(0, 1), c(1, 1), c(1, 2)],
  ],
  Z: [
    [c(0, 0), c(1, 0), c(1, 1), c(2, 1)],
    [c(1, 0), c(0, 1), c(1, 1), c(0, 2)],
    [c(0, 0), c(1, 0), c(1, 1), c(2, 1)],
    [c(1, 0), c(0, 1), c(1, 1), c(0, 2)],
  ],
  J: [
    [c(0, 0), c(0, 1), c(1, 1), c(2, 1)],
    [c(0, 0), c(1, 0), c(0, 1), c(0, 2)],
    [c(0, 0), c(1, 0), c(2, 0), c(2, 1)],
    [c(1, 0), c(1, 1), c(0, 2), c(1, 2)],
  ],
  L: [
    [c(2, 0), c(0, 1), c(1, 1), c(2, 1)],
    [c(0, 0), c(0, 1), c(0, 2), c(1, 2)],
    [c(0, 0), c(1, 0), c(2, 0), c(0, 1)],
    [c(0, 0), c(1, 0), c(1, 1), c(1, 2)],
  ],
};

const LINE_SCORE = [0, 100, 300, 500, 800];

const randType = () => TYPES[(Math.random() * TYPES.length) | 0];

export function createGame() {
  const state = {
    grid: Array.from({ length: ROWS }, () => Array(COLS).fill(0)),
    piece: null,
    score: 0,
    lines: 0,
    dead: false,
    next: randType(),
  };
  spawn(state);
  return state;
}

export function collides(state, piece) {
  for (const c of SHAPES[piece.type][piece.rot]) {
    const x = piece.x + c.x;
    const y = piece.y + c.y;
    if (x < 0 || x >= COLS || y >= ROWS) return true;
    if (y >= 0 && state.grid[y][x] !== 0) return true;
  }
  return false;
}

// Place `next` at top-center; roll a new `next` on success.
export function spawn(state) {
  const cells = SHAPES[state.next][0];
  const w = Math.max(...cells.map((c) => c.x)) + 1;
  const piece = { type: state.next, rot: 0, x: ((COLS - w) / 2) | 0, y: 0 };
  if (collides(state, piece)) {
    state.dead = true;
    state.piece = null;
    return false;
  }
  state.piece = piece;
  state.next = randType();
  return true;
}

export function move(state, dx) {
  if (state.dead || !state.piece) return false;
  const piece = { ...state.piece, x: state.piece.x + dx };
  if (collides(state, piece)) return false;
  state.piece = piece;
  return true;
}

// No wall kicks: reject the rotation if the new cells collide.
export function rotate(state) {
  if (state.dead || !state.piece) return false;
  const piece = { ...state.piece, rot: (state.piece.rot + 1) % 4 };
  if (collides(state, piece)) return false;
  state.piece = piece;
  return true;
}

export function lockPiece(state) {
  const p = state.piece;
  if (!p) return;
  const id = TYPES.indexOf(p.type) + 1;
  for (const c of SHAPES[p.type][p.rot]) {
    const y = p.y + c.y;
    const x = p.x + c.x;
    if (y >= 0 && y < ROWS) state.grid[y][x] = id;
  }
  state.piece = null;
}

export function clearLines(state) {
  const kept = state.grid.filter((row) => row.some((v) => v === 0));
  const cleared = ROWS - kept.length;
  if (!cleared) return 0;
  state.grid = kept;
  while (state.grid.length < ROWS) state.grid.unshift(Array(COLS).fill(0));
  state.lines += cleared;
  state.score += LINE_SCORE[cleared] ?? 0;
  return cleared;
}

export function hardDrop(state) {
  if (state.dead || !state.piece) return 0;
  let dropped = 0;
  while (!collides(state, { ...state.piece, y: state.piece.y + 1 })) {
    state.piece.y++;
    dropped++;
  }
  lockPiece(state);
  clearLines(state);
  spawn(state);
  state.score += dropped;
  return dropped;
}

export function step(state) {
  if (state.dead || !state.piece) return false;
  if (!collides(state, { ...state.piece, y: state.piece.y + 1 })) {
    state.piece.y++;
    return true;
  }
  lockPiece(state);
  clearLines(state);
  spawn(state);
  return !state.dead;
}

export default {
  id: 'tetris',
  name: 'Tetris',
  freeChoice: true,
  levels: [{ id: 1, label: 'Marathon' }],
  mount() {
    throw new Error('tetris mount not implemented yet (Task 4)');
  },
};
