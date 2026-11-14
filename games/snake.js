const OPEN = Array(12).fill('................');

export const LEVELS = [
  { id: 1, label: 'Level 1 — Garden', target: 5, speedMs: 200, maze: OPEN },
  { id: 2, label: 'Level 2 — Meadow', target: 8, speedMs: 160, maze: OPEN },
  {
    id: 3, label: 'Level 3 — Twin Hedges', target: 8, speedMs: 140,
    maze: [
      '................', '................', '................',
      '....########....', '................', '................',
      '................', '....########....', '................',
      '................', '................', '................',
    ],
  },
  {
    id: 4, label: 'Level 4 — Pillar Hall', target: 10, speedMs: 120,
    maze: [
      '................', '................', '....##......##..',
      '....##......##..', '....##......##..', '....##......##..',
      '....##......##..', '....##......##..', '....##......##..',
      '....##......##..', '................', '................',
    ],
  },
  {
    id: 5, label: 'Level 5 — The Vault', target: 10, speedMs: 100,
    maze: [
      '................', '..############..', '..#..........#..',
      '..#..........#..', '..#..........#..', '..#..........#..',
      '..#..........#..', '..#..........#..', '..#..........#..',
      '..############..', '................', '................',
    ],
  },
  {
    id: 6, label: 'Level 6 — Labyrinth', target: 12, speedMs: 90,
    maze: [
      '................', '................', '................',
      '#############...', '................', '................',
      '................', '...#############', '................',
      '................', '................', '................',
    ],
  },
];

const DIRS = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } };
const OPPOSITE = { up: 'down', down: 'up', left: 'right', right: 'left' };

function startSnake(cols, rows, walls) {
  const cx = cols >> 1, cy = rows >> 1;
  let best = null;
  const fits = (x, y) => !walls.has(`${x},${y}`);
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x + 2 < cols; x++) {
      if (!fits(x, y) || !fits(x + 1, y) || !fits(x + 2, y)) continue;
      // prefer a run whose cell beyond the head (head faces right) is free
      const forward = x + 3 < cols && fits(x + 3, y);
      const headX = x + 2;
      const cost = Math.abs(headX - cx) + Math.abs(y - cy) + (forward ? 0 : 1000);
      if (!best || cost < best.cost) best = { x, y, cost };
    }
  }
  const { x, y } = best;
  return [{ x: x + 2, y }, { x: x + 1, y }, { x, y }];
}

// cells the head can actually reach (body treated as passable — it moves)
function reachable(state) {
  const seen = new Set([`${state.snake[0].x},${state.snake[0].y}`]);
  const stack = [{ ...state.snake[0] }];
  const out = [];
  while (stack.length) {
    const { x, y } = stack.pop();
    out.push({ x, y });
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx;
      const ny = y + dy;
      const key = `${nx},${ny}`;
      if (nx < 0 || ny < 0 || nx >= state.cols || ny >= state.rows) continue;
      if (state.walls.has(key) || seen.has(key)) continue;
      seen.add(key);
      stack.push({ x: nx, y: ny });
    }
  }
  return out;
}

function placeFood(state) {
  const onSnake = new Set(state.snake.map((c) => `${c.x},${c.y}`));
  // only reachable cells — a closed maze (Vault) must not spawn food outside
  const free = reachable(state).filter((c) => !onSnake.has(`${c.x},${c.y}`));
  if (!free.length) return null;
  return free[Math.floor(Math.random() * free.length)];
}

export function createGame(level) {
  const rows = level.maze.length;
  const cols = level.maze[0].length;
  const walls = new Set();
  level.maze.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) if (row[x] === '#') walls.add(`${x},${y}`);
  });
  const state = {
    level, cols, rows, walls,
    snake: startSnake(cols, rows, walls),
    dir: 'right', nextDir: 'right',
    food: null, score: 0, cleared: false, dead: false,
  };
  state.food = placeFood(state);
  return state;
}

// cell size that fits the available playfield on both axes: 14px floor, 34px cap
export function cellSizeFor(availW, availH, cols, rows) {
  return Math.max(14, Math.min(34, Math.floor(Math.min(availW / cols, availH / rows))));
}

// touch swipe → direction; dominant axis wins, tiny swipes ignored
export function swipeDir(dx, dy) {
  const threshold = 20;
  if (Math.abs(dx) < threshold && Math.abs(dy) < threshold) return null;
  if (Math.abs(dx) >= Math.abs(dy)) return dx > 0 ? 'right' : 'left';
  return dy > 0 ? 'down' : 'up';
}

export function setDir(state, dir) {
  if (!DIRS[dir] || state.dead || state.cleared) return;
  if (dir === OPPOSITE[state.dir]) return; // no 180° into the neck
  state.nextDir = dir;
}

export function step(state, input) {
  if (state.dead || state.cleared) return state;
  if (input) setDir(state, input);
  state.dir = state.nextDir;
  const d = DIRS[state.dir];
  const head = { x: state.snake[0].x + d.x, y: state.snake[0].y + d.y };
  if (
    head.x < 0 || head.y < 0 || head.x >= state.cols || head.y >= state.rows ||
    state.walls.has(`${head.x},${head.y}`)
  ) {
    state.dead = true;
    return state;
  }
  const eating = state.food && head.x === state.food.x && head.y === state.food.y;
  const body = eating ? state.snake : state.snake.slice(0, -1);
  if (body.some((c) => c.x === head.x && c.y === head.y)) {
    state.dead = true;
    return state;
  }
  state.snake.unshift(head);
  if (eating) {
    state.score += 1;
    state.food = placeFood(state);
    if (state.score >= state.level.target) state.cleared = true;
  } else {
    state.snake.pop();
  }
  return state;
}

export default {
  id: 'snake',
  name: 'Snake',
  icon: '🐍',
  blurb: 'Eat, grow, don\'t bite yourself',
  levels: LEVELS,
  mount(root, options) {
    const level = LEVELS.find((l) => l.id === options.level) || LEVELS[0];
    let state = createGame(level);
    let announcedClear = false;

    let paused = false;
    const hud = document.createElement('div');
    hud.className = 'hud';
    const pauseBtn = document.createElement('button');
    pauseBtn.type = 'button';
    pauseBtn.className = 'btn';
    pauseBtn.textContent = '⏸ Pause';
    pauseBtn.addEventListener('click', () => {
      paused = !paused;
      pauseBtn.textContent = paused ? '▶ Continue' : '⏸ Pause';
    });
    const grid = document.createElement('div');
    grid.className = 'snake-grid';
    const overlay = document.createElement('div');
    overlay.className = 'overlay';
    overlay.hidden = true;
    const dpad = document.createElement('div');
    dpad.className = 'dpad';
    for (const [label, d] of [['↑', 'up'], ['←', 'left'], ['↓', 'down'], ['→', 'right']]) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'btn dpad-btn';
      b.textContent = label;
      b.addEventListener('click', () => setDir(state, d));
      dpad.appendChild(b);
    }
    root.append(hud, pauseBtn, grid, dpad, overlay);

    const cells = [];
    for (let i = 0; i < state.cols * state.rows; i++) {
      const c = document.createElement('div');
      c.className = 'cell';
      grid.appendChild(c);
      cells.push(c);
    }

    // size the board to exactly the space left after hud/buttons — no page scroll
    function fitGrid() {
      const chrome = hud.offsetHeight + pauseBtn.offsetHeight + dpad.offsetHeight + 32;
      const availH = Math.max(60, window.innerHeight - root.getBoundingClientRect().top - chrome);
      const availW = root.clientWidth;
      // -16 for grid gaps + border, which cellSizeFor's rows math doesn't count
      const cell = cellSizeFor(availW, availH - 16, state.cols, state.rows);
      grid.style.gridTemplateColumns = `repeat(${state.cols}, ${cell}px)`;
      grid.style.gridTemplateRows = `repeat(${state.rows}, ${cell}px)`;
    }
    fitGrid();
    window.addEventListener('resize', fitGrid);

    function draw() {
      hud.textContent = `Score ${state.score} / ${level.target}`;
      for (let y = 0; y < state.rows; y++) {
        for (let x = 0; x < state.cols; x++) {
          const c = cells[y * state.cols + x];
          c.className = 'cell';
          if (state.walls.has(`${x},${y}`)) c.className += ' wall';
        }
      }
      for (const seg of state.snake) cells[seg.y * state.cols + seg.x].className += ' snake';
      if (state.snake[0]) cells[state.snake[0].y * state.cols + state.snake[0].x].className += ' head';
      if (state.food) cells[state.food.y * state.cols + state.food.x].className += ' food';
    }

    function showOverlay(title, buttons) {
      overlay.innerHTML = '';
      overlay.className = 'overlay';
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

    function restart() {
      state = createGame(level);
      announcedClear = false;
      lastScore = 0;
      overlay.hidden = true;
      draw();
    }

    let lastScore = 0;
    function tick() {
      if (paused || state.dead || state.cleared) return;
      step(state);
      if (state.dead) {
        showOverlay('Game Over', [
          ['Restart', restart],
          ['Choose Level', () => options.onExit()],
        ]);
      } else {
        if (state.score > lastScore) {
          lastScore = state.score;
          options.onScore(state.score);
        }
        if (state.cleared && !announcedClear) {
          announcedClear = true;
          options.onCleared(level.id);
          const hasNext = LEVELS.indexOf(level) < LEVELS.length - 1;
          showOverlay('Level Clear!', [
            ...(hasNext ? [['Next Level →', () => options.onNext()]] : []),
            ['Choose Level', () => options.onExit()],
            ['Play Again', restart],
          ]);
        }
      }
      draw();
    }

    function onKey(e) {
      const map = {
        ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
        w: 'up', s: 'down', a: 'left', d: 'right',
        W: 'up', S: 'down', A: 'left', D: 'right',
      };
      const dir = map[e.key];
      if (dir) {
        e.preventDefault();
        setDir(state, dir);
      }
    }

    // touch: swipe anywhere on the grid to steer
    let touchStart = null;
    function onTouchStart(e) {
      const t = e.changedTouches[0];
      touchStart = { x: t.clientX, y: t.clientY };
    }
    function onTouchEnd(e) {
      if (!touchStart) return;
      const t = e.changedTouches[0];
      const dir = swipeDir(t.clientX - touchStart.x, t.clientY - touchStart.y);
      if (dir) setDir(state, dir);
      touchStart = null;
    }
    grid.addEventListener('touchstart', onTouchStart, { passive: true });
    grid.addEventListener('touchend', onTouchEnd, { passive: true });

    window.addEventListener('keydown', onKey);
    const timer = setInterval(tick, level.speedMs);
    draw();

    return () => {
      clearInterval(timer);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', fitGrid);
      grid.removeEventListener('touchstart', onTouchStart);
      grid.removeEventListener('touchend', onTouchEnd);
    };
  },
};
