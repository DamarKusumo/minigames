export const W = 320;
export const H = 400;
export const CELL = 20;
export const BALL_R = 4;
export const PADDLE_W = 48;
export const PADDLE_H = 10;
export const PADDLE_Y = 380;

export const LEVELS = [
  { id: 1, label: 'Level 1 — Warm-up', ballSpeed: 2, paddleSpeed: 5, fallMs: 0, bricks: [
    '1111111111111111',
    '1111111111111111',
    '1111111111111111',
  ] },
  { id: 2, label: 'Level 2 — Double thick', ballSpeed: 2, paddleSpeed: 5, fallMs: 0, bricks: [
    '2222222222222222',
    '1111111111111111',
    '1111111111111111',
  ] },
  { id: 3, label: 'Level 3 — Pyramid', ballSpeed: 2.5, paddleSpeed: 5, fallMs: 5000, bricks: [
    '....11111111....',
    '...1111111111...',
    '..111111111111..',
    '.11111111111111.',
  ] },
  { id: 4, label: 'Level 4 — Checkers', ballSpeed: 3, paddleSpeed: 6, fallMs: 4000, bricks: [
    '1.2.1.2.1.2.1.2.',
    '.1.2.1.2.1.2.1.2',
    '1.2.1.2.1.2.1.2.',
    '.1.2.1.2.1.2.1.2',
  ] },
  { id: 5, label: 'Level 5 — The Vault', ballSpeed: 3, paddleSpeed: 6, fallMs: 3000, bricks: [
    '2222222222222222',
    '2..............2',
    '2.111111111111.2',
    '2..............2',
    '2222222222222222',
  ] },
  { id: 6, label: 'Level 6 — Overload', ballSpeed: 4, paddleSpeed: 6, fallMs: 2200, bricks: [
    '2222222222222222',
    '2222222222222222',
    '1111111111111111',
    '1111111111111111',
    '1111111111111111',
  ] },
];

export const DROP_TYPES = ['wide', 'multi', 'slow', 'extra'];

export function dropType(rng) {
  return DROP_TYPES[Math.floor(rng() * DROP_TYPES.length)];
}

export function createGame(level, rng = Math.random) {
  return {
    level,
    rng,
    bricks: level.bricks.map((row) => [...row].map((ch) => (ch === '.' ? 0 : Number(ch)))),
    balls: [{ x: W / 2, y: H - 60, dx: level.ballSpeed, dy: -level.ballSpeed }],
    paddle: { x: W / 2, w: PADDLE_W },
    drops: [],
    timers: { wide: 0, slow: 0, multi: 0 },
    score: 0,
    lives: 3,
    cleared: false,
    dead: false,
    deadReason: null,
  };
}

// shift the whole formation down one row; bricks reaching the paddle line kill the run
export function fallBricks(state) {
  if (state.dead || state.cleared) return;
  const cols = state.bricks[0].length;
  state.bricks.unshift(Array(cols).fill(0));
  const breachRow = Math.floor(PADDLE_Y / CELL);
  for (let r = 0; r < state.bricks.length; r++) {
    if (r >= breachRow && state.bricks[r].some((v) => v > 0)) {
      state.dead = true;
      state.deadReason = 'bricks';
      return;
    }
  }
}

// scale that keeps the whole board inside availW x availH, up to 1.75x on desktop
export function fitScale(availW, availH) {
  return Math.min(availW / W, availH / H, 1.75);
}

export function setPaddleX(state, x) {
  const half = state.paddle.w / 2;
  state.paddle.x = Math.min(Math.max(x, half), W - half);
}

export function movePaddle(state, dir) {
  const half = state.paddle.w / 2;
  state.paddle.x = Math.min(Math.max(state.paddle.x + dir * state.level.paddleSpeed, half), W - half);
}

function resetBall(state) {
  state.balls = [{
    x: state.paddle.x,
    y: PADDLE_Y - 20,
    dx: state.level.ballSpeed,
    dy: -state.level.ballSpeed,
  }];
}

// one ball → three (negated dx and straight up); no-op when already split
export function splitBalls(state) {
  if (state.balls.length !== 1) return;
  const b = state.balls[0];
  state.balls.push({ ...b, dx: -b.dx }, { ...b, dx: 0 });
}

function hitBrick(state, b) {
  const col = Math.floor(b.x / CELL);
  const row = Math.floor(b.y / CELL);
  if (row < 0 || row >= state.bricks.length || col < 0 || col >= state.bricks[row].length) return false;
  const v = state.bricks[row][col];
  if (v <= 0) return false;
  state.bricks[row][col] = v - 1;
  state.score += 1;
  b.dy = -b.dy;
  if (v - 1 === 0 && state.rng() < 0.25) {
    state.drops.push({ x: col * CELL + CELL / 2, y: row * CELL + CELL / 2, type: dropType(state.rng) });
  }
  if (!state.bricks.some((r) => r.some((c) => c > 0))) state.cleared = true;
  return true;
}

// falling skill drops: catch on paddle, discard past the bottom
export function fallDrops(state) {
  const keep = [];
  for (const d of state.drops) {
    d.y += 1.5;
    const onPaddle = d.y >= PADDLE_Y && d.y <= PADDLE_Y + PADDLE_H + 8 &&
      Math.abs(d.x - state.paddle.x) <= state.paddle.w / 2 + 8;
    if (onPaddle) {
      applyDrop(state, d);
    } else if (d.y <= H) {
      keep.push(d);
    }
  }
  state.drops = keep;
}

function applyDrop(state, d) {
  if (d.type === 'wide') {
    state.timers.wide = 625;
    state.paddle.w = 80;
  } else if (d.type === 'slow') {
    state.timers.slow = 500;
  } else if (d.type === 'multi') {
    state.timers.multi = 625;
    splitBalls(state);
  } else if (d.type === 'extra') {
    state.lives += 1;
  }
}

export function step(state) {
  if (state.dead || state.cleared) return state;
  // effect timers drive paddle width and ball speed this tick (never mutate base dx/dy)
  state.timers.wide = Math.max(0, state.timers.wide - 1);
  state.timers.slow = Math.max(0, state.timers.slow - 1);
  const multiWasOn = state.timers.multi > 0;
  state.timers.multi = Math.max(0, state.timers.multi - 1);
  if (multiWasOn && state.timers.multi === 0 && state.balls.length > 1) {
    state.balls = [state.balls[0]]; // multi ends after 10s
  }
  state.paddle.w = state.timers.wide > 0 ? 80 : PADDLE_W;
  state.paddle.x = Math.min(Math.max(state.paddle.x, state.paddle.w / 2), W - state.paddle.w / 2);
  const speed = state.timers.slow > 0 ? 0.6 : 1;
  const keep = [];
  for (const b of state.balls) {
    b.x += b.dx * speed;
    b.y += b.dy * speed;

    if (b.x < BALL_R) {
      b.x = BALL_R;
      b.dx = Math.abs(b.dx);
    } else if (b.x > W - BALL_R) {
      b.x = W - BALL_R;
      b.dx = -Math.abs(b.dx);
    }
    if (b.y < BALL_R) {
      b.y = BALL_R;
      b.dy = Math.abs(b.dy);
    }

    // brick region sits at the top of the field
    if (b.y < state.bricks.length * CELL && hitBrick(state, b)) {
      keep.push(b);
      continue;
    }

    if (
      b.dy > 0 &&
      b.y >= PADDLE_Y && b.y <= PADDLE_Y + PADDLE_H &&
      b.x >= state.paddle.x - state.paddle.w / 2 - BALL_R &&
      b.x <= state.paddle.x + state.paddle.w / 2 + BALL_R
    ) {
      b.y = PADDLE_Y;
      b.dy = -Math.abs(b.dy);
      // steer by where the ball lands on the paddle
      const offset = (b.x - state.paddle.x) / (state.paddle.w / 2);
      b.dx = offset * state.level.ballSpeed;
    }

    if (b.y - BALL_R > H) continue; // ball lost
    keep.push(b);
  }
  state.balls = keep;
  if (state.balls.length === 0) {
    state.lives -= 1;
    if (state.lives <= 0) {
      state.lives = 0;
      state.dead = true;
      state.deadReason = 'balls';
    } else {
      resetBall(state);
    }
  }
  return state;
}

export default {
  id: 'bounce',
  name: 'Bounce',
  icon: '🧱',
  blurb: 'Break every brick',
  levels: LEVELS,
  mount(root, options) {
    const level = LEVELS.find((l) => l.id === options.level) || LEVELS[0];
    let state = createGame(level);
    let announcedClear = false;
    let lastScore = 0;
    let dir = 0;

    let paused = false;
    let fallAcc = 0;
    const hud = document.createElement('div');
    hud.className = 'hud';
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
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const overlay = document.createElement('div');
    overlay.className = 'overlay';
    overlay.hidden = true;
    const dpad = document.createElement('div');
    dpad.className = 'dpad dpad-2';
    for (const [label, d] of [['◀', -1], ['▶', 1]]) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'btn dpad-btn';
      b.textContent = label;
      // hold to steer: press = move, release = stop
      b.addEventListener('pointerdown', () => { dir = d; });
      b.addEventListener('pointerup', () => { dir = 0; });
      b.addEventListener('pointerleave', () => { dir = 0; });
      b.addEventListener('pointercancel', () => { dir = 0; });
      dpad.appendChild(b);
    }
    root.append(pauseBtn, hud, canvas, dpad, overlay);
    const ctx = canvas.getContext('2d');

    // size the canvas to exactly the space left after hud/buttons — no page scroll
    function fit() {
      const chrome = hud.offsetHeight + pauseBtn.offsetHeight + dpad.offsetHeight
        + parseFloat(getComputedStyle(dpad).marginTop)
        + parseFloat(getComputedStyle(root.parentElement).paddingBottom)
        + 32;
      const availH = Math.max(80, window.innerHeight - root.getBoundingClientRect().top - chrome);
      const s = fitScale(root.clientWidth, availH);
      canvas.style.width = `${Math.floor(W * s)}px`;
      canvas.style.height = `${Math.floor(H * s)}px`;
    }
    window.addEventListener('resize', fit);

    function draw() {
      hud.textContent = `Score ${state.score} — Lives ${state.lives}`;
      ctx.fillStyle = '#0a0a12';
      ctx.fillRect(0, 0, W, H);
      const colors = ['#39ff88', '#ffd23f'];
      for (let r = 0; r < state.bricks.length; r++) {
        for (let c = 0; c < state.bricks[r].length; c++) {
          const v = state.bricks[r][c];
          if (v > 0) {
            ctx.fillStyle = colors[Math.min(v, 2) - 1];
            ctx.fillRect(c * CELL + 1, r * CELL + 1, CELL - 2, CELL - 2);
          }
        }
      }
      const dropStyle = { wide: ['#39ff88', 'W'], multi: ['#ffd23f', 'M'], slow: ['#55aaff', 'S'], extra: ['#ff5566', '♥'] };
      for (const d of state.drops) {
        const [color, glyph] = dropStyle[d.type];
        ctx.fillStyle = color;
        ctx.fillRect(d.x - 8, d.y - 8, 16, 16);
        ctx.fillStyle = '#0a0a12';
        ctx.font = 'bold 12px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(glyph, d.x, d.y);
      }
      ctx.fillStyle = '#d8d8e8';
      ctx.fillRect(state.paddle.x - state.paddle.w / 2, PADDLE_Y, state.paddle.w, PADDLE_H);
      ctx.fillStyle = '#ff5566';
      for (const b of state.balls) {
        ctx.beginPath();
        ctx.arc(b.x, b.y, BALL_R, 0, Math.PI * 2);
        ctx.fill();
      }
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
      fallAcc = 0;
      overlay.hidden = true;
      draw();
    }

    function tick() {
      if (paused || state.dead || state.cleared) return;
      if (dir !== 0) movePaddle(state, dir);
      step(state);
      fallDrops(state);
      fallAcc += 16;
      if (level.fallMs > 0 && fallAcc >= level.fallMs) {
        fallAcc = 0;
        fallBricks(state);
      }
      if (state.dead) {
        showOverlay(state.deadReason === 'bricks' ? 'Bricks reached the bottom' : 'Game Over', [
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

    function onKeyDown(e) {
  if (e.key === ' ') {
    if (document.activeElement instanceof HTMLButtonElement) return;
    e.preventDefault();
    togglePause();
    return;
  }
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        dir = -1;
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        dir = 1;
      }
    }
    function onKeyUp(e) {
      if (['ArrowLeft', 'ArrowRight', 'a', 'A', 'd', 'D'].includes(e.key)) dir = 0;
    }

    // touch: drag a finger on the canvas to move the paddle
    function touchX(e) {
      const rect = canvas.getBoundingClientRect();
      const t = e.changedTouches[0];
      return (t.clientX - rect.left) * (W / rect.width);
    }
    function onTouchStart(e) {
      setPaddleX(state, touchX(e));
    }
    function onTouchMove(e) {
      setPaddleX(state, touchX(e));
    }
    canvas.addEventListener('touchstart', onTouchStart, { passive: true });
    canvas.addEventListener('touchmove', onTouchMove, { passive: true });

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    const timer = setInterval(tick, 16);
    draw();
    fit(); // after draw so the hud has its real height

    return () => {
      clearInterval(timer);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('resize', fit);
      canvas.removeEventListener('touchstart', onTouchStart);
      canvas.removeEventListener('touchmove', onTouchMove);
    };
  },
};
