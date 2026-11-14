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
  icon: '🟦',
  blurb: 'Stack tetrominoes, clear lines',
  freeChoice: true,
  levels: [{ id: 1, label: 'Marathon' }],
  mount(root, options) {
    let state = createGame();
    let paused = false;
    let lastScore = 0;

    const pauseBtn = document.createElement('button');
    pauseBtn.type = 'button';
    pauseBtn.className = 'btn';
    pauseBtn.textContent = '⏸ Pause';
    function togglePause() {
      if (!overlay.hidden) return; // result screen owns the pause state
      paused = !paused;
      pauseBtn.textContent = paused ? '▶ Continue' : '⏸ Pause';
    }
    pauseBtn.addEventListener('click', togglePause);

    const top = document.createElement('div');
    top.className = 'tetris-top';
    const hud = document.createElement('div');
    hud.className = 'hud';
    const nextWrap = document.createElement('div');
    nextWrap.className = 'tetris-next-wrap';
    nextWrap.appendChild(Object.assign(document.createElement('span'), { textContent: 'Next' }));
    const next = document.createElement('div');
    next.className = 'tetris-next';
    const nextCells = [];
    for (let i = 0; i < 16; i++) {
      const c = document.createElement('div');
      c.className = 'tetris-cell';
      next.appendChild(c);
      nextCells.push(c);
    }
    nextWrap.appendChild(next);
    top.append(hud, nextWrap);

    const grid = document.createElement('div');
    grid.className = 'tetris-grid';

    const overlay = document.createElement('div');
    overlay.className = 'overlay';
    overlay.hidden = true;

    const controls = document.createElement('div');
    controls.className = 'tetris-controls';
    for (const [label, fn] of [
      ['←', () => move(state, -1)],
      ['→', () => move(state, 1)],
      ['↻', () => rotate(state)],
      ['⤓', () => hardDrop(state)],
    ]) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'btn';
      b.textContent = label;
      b.addEventListener('click', () => act(fn));
      controls.appendChild(b);
    }

    root.append(pauseBtn, top, grid, controls, overlay);

    const cells = [];
    for (let i = 0; i < ROWS * COLS; i++) {
      const c = document.createElement('div');
      c.className = 'tetris-cell';
      grid.appendChild(c);
      cells.push(c);
    }

    // 800ms start, -50ms per 10 lines, 100ms floor
    const gravityMs = () => Math.max(100, 800 - 50 * Math.floor(state.lines / 10));
    let intervalMs = gravityMs();
    let timer = null;
    function restartTimer() {
      clearInterval(timer);
      timer = setInterval(tick, intervalMs);
    }

    // size the board to exactly the space left after hud/buttons — no page scroll
    function fitGrid() {
      const chrome = top.offsetHeight + pauseBtn.offsetHeight + controls.offsetHeight
        + parseFloat(getComputedStyle(controls).marginTop)
        + parseFloat(getComputedStyle(root.parentElement).paddingBottom)
        + 32;
      const availH = Math.max(60, window.innerHeight - root.getBoundingClientRect().top - chrome);
      // snake's cellSizeFor equivalent: 14px floor, 34px cap
      const cell = Math.max(14, Math.min(34, Math.floor(Math.min(root.clientWidth / COLS, (availH - 16) / ROWS))));
      grid.style.gridTemplateColumns = `repeat(${COLS}, ${cell}px)`;
      grid.style.gridTemplateRows = `repeat(${ROWS}, ${cell}px)`;
      const n = Math.max(8, Math.floor(cell / 2));
      next.style.gridTemplateColumns = `repeat(4, ${n}px)`;
      next.style.gridTemplateRows = `repeat(4, ${n}px)`;
    }
    window.addEventListener('resize', fitGrid);

    function draw() {
      hud.textContent = `Score ${state.score} · Lines ${state.lines}`;
      for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
          const v = state.grid[y][x];
          cells[y * COLS + x].className = 'tetris-cell' + (v ? ` t${v}` : '');
        }
      }
      if (state.piece) {
        const id = TYPES.indexOf(state.piece.type) + 1;
        for (const c of SHAPES[state.piece.type][state.piece.rot]) {
          const y = state.piece.y + c.y;
          if (y >= 0) cells[y * COLS + (state.piece.x + c.x)].className = `tetris-cell t${id}`;
        }
      }
      const nid = TYPES.indexOf(state.next) + 1;
      for (const c of nextCells) c.className = 'tetris-cell';
      for (const c of SHAPES[state.next][0]) nextCells[c.y * 4 + c.x].className = `tetris-cell t${nid}`;
    }

    function showOverlay(title, buttons) {
      overlay.innerHTML = '';
      overlay.hidden = false;
      const h = document.createElement('h2');
      h.textContent = title;
      overlay.appendChild(h);
      for (const [label, fn] of buttons) {
        const btn = document.createElement('button');
        btn.className = 'btn';
        btn.textContent = label;
        btn.addEventListener('click', fn);
        overlay.appendChild(btn);
      }
    }

    function gameOver() {
      showOverlay('Game Over', [
        ['Restart', restart],
        ['Choose Level', () => options.onExit()],
      ]);
    }

    function restart() {
      state = createGame();
      lastScore = 0;
      paused = false;
      pauseBtn.textContent = '⏸ Pause';
      overlay.hidden = true;
      intervalMs = gravityMs();
      restartTimer();
      draw();
      fitGrid();
    }

    function announce() {
      if (state.score > lastScore) {
        lastScore = state.score;
        options.onScore(state.score);
      }
    }

    function afterAction() {
      announce();
      if (state.dead) gameOver();
      else if (gravityMs() !== intervalMs) {
        intervalMs = gravityMs();
        restartTimer();
      }
      draw();
    }

    function act(fn) {
      if (paused || !overlay.hidden) return;
      fn();
      afterAction();
    }

    function tick() {
      if (paused || state.dead) return;
      step(state);
      afterAction();
    }

    function onKey(e) {
      if (!overlay.hidden) return; // result screen owns input
      if (e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        togglePause();
        return;
      }
      if (e.key === ' ') {
        if (document.activeElement instanceof HTMLButtonElement) return;
        e.preventDefault();
        act(() => hardDrop(state)); // space = hard drop; pause is button + p/P
        return;
      }
      if (paused || state.dead) return;
      const dx = { ArrowLeft: -1, ArrowRight: 1 }[e.key];
      if (dx !== undefined) {
        e.preventDefault();
        act(() => move(state, dx));
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        act(() => step(state));
      } else if (e.key === 'ArrowUp' || e.key === 'x' || e.key === 'X') {
        e.preventDefault();
        act(() => rotate(state));
      }
    }

    window.addEventListener('keydown', onKey);
    restartTimer();
    draw();
    fitGrid(); // after draw so the hud has its real height

    return () => {
      clearInterval(timer);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', fitGrid);
      // control-button listeners die with the DOM nodes root.clear() removes
    };
  },
};
