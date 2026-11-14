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
  mount(root, options) {
    let state = createGame();

    const hud = document.createElement('div');
    hud.className = 'hud';
    const grid = document.createElement('div');
    grid.className = 'g2048-grid';
    const overlay = document.createElement('div');
    overlay.className = 'overlay';
    overlay.hidden = true;
    root.append(hud, grid, overlay);

    const cells = [];
    for (let i = 0; i < 16; i++) {
      const c = document.createElement('div');
      c.className = 'g2048-cell';
      grid.appendChild(c);
      cells.push(c);
    }

    // size the board to the space left after hud — no page scroll
    function fit() {
      const chrome = hud.offsetHeight
        + parseFloat(getComputedStyle(root.parentElement).paddingBottom)
        + 32;
      const availH = Math.max(60, window.innerHeight - root.getBoundingClientRect().top - chrome);
      // -16 for grid gap + border
      const cell = Math.max(36, Math.min(96, Math.floor(Math.min(root.clientWidth, availH - 16) / 4)));
      grid.style.gridTemplateColumns = `repeat(4, ${cell}px)`;
      grid.style.gridTemplateRows = `repeat(4, ${cell}px)`;
      grid.style.fontSize = `${Math.max(14, Math.floor(cell * 0.32))}px`;
    }
    window.addEventListener('resize', fit);

    function draw() {
      hud.textContent = `Score ${state.score}`;
      for (let i = 0; i < 16; i++) {
        const v = state.board[i];
        const c = cells[i];
        c.className = 'g2048-cell' + (v ? (v >= 2048 ? ' v-high' : ` v${v}`) : '');
        c.textContent = v ? String(v) : '';
      }
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

    function restart() {
      state = createGame();
      overlay.hidden = true;
      draw();
      fit();
    }

    function doMove(dir) {
      if (state.dead) return;
      const prev = state.score;
      if (!move(state, dir)) return;
      draw();
      if (state.score > prev) options.onScore(state.score);
      if (!canMove(state)) {
        state.dead = true;
        showOverlay('Game Over', [
          ['Restart', restart],
          ['Choose Level', () => options.onExit()],
        ]);
      }
    }

    function onKey(e) {
      const map = {
        ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
        w: 'up', s: 'down', a: 'left', d: 'right',
        W: 'up', S: 'down', A: 'left', D: 'right',
      };
      const dir = map[e.key];
      if (!dir) return;
      if (e.key.startsWith('Arrow')) e.preventDefault();
      doMove(dir);
    }

    // touch: swipe on the grid (threshold 20px, snake's pattern — kept local)
    let touchStart = null;
    function onTouchStart(e) {
      const t = e.changedTouches[0];
      touchStart = { x: t.clientX, y: t.clientY };
    }
    function onTouchEnd(e) {
      if (!touchStart) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - touchStart.x;
      const dy = t.clientY - touchStart.y;
      touchStart = null;
      if (Math.abs(dx) < 20 && Math.abs(dy) < 20) return;
      if (Math.abs(dx) >= Math.abs(dy)) doMove(dx > 0 ? 'right' : 'left');
      else doMove(dy > 0 ? 'down' : 'up');
    }
    grid.addEventListener('touchstart', onTouchStart, { passive: true });
    grid.addEventListener('touchend', onTouchEnd, { passive: true });

    window.addEventListener('keydown', onKey);
    draw();
    fit(); // after draw so the hud has its real height

    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', fit);
      grid.removeEventListener('touchstart', onTouchStart);
      grid.removeEventListener('touchend', onTouchEnd);
    };
  },
};
