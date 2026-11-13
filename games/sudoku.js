export const SUDOKU_LEVELS = [
  { id: 1, label: 'Easy', holes: 36 },
  { id: 2, label: 'Medium', holes: 45 },
  { id: 3, label: 'Hard', holes: 52 },
];

export function isValidPlacement(grid, index, value) {
  const r = Math.floor(index / 9);
  const c = index % 9;
  for (let i = 0; i < 9; i++) {
    const rowIdx = r * 9 + i;
    if (rowIdx !== index && grid[rowIdx] === value) return false;
    const colIdx = i * 9 + c;
    if (colIdx !== index && grid[colIdx] === value) return false;
  }
  const br = Math.floor(r / 3) * 3;
  const bc = Math.floor(c / 3) * 3;
  for (let dr = 0; dr < 3; dr++) {
    for (let dc = 0; dc < 3; dc++) {
      const i = (br + dr) * 9 + (bc + dc);
      if (i !== index && grid[i] === value) return false;
    }
  }
  return true;
}

function candidatesAt(grid, index) {
  const out = [];
  for (let v = 1; v <= 9; v++) if (isValidPlacement(grid, index, v)) out.push(v);
  return out;
}

// counts solutions up to `cap` (2) — MRV keeps uniqueness proofs fast in practice
export function solveCount(grid, cap = 2) {
  const g = grid.slice();
  let count = 0;
  function recurse() {
    if (count >= cap) return;
    let best = -1;
    let bestCands = null;
    for (let i = 0; i < 81; i++) {
      if (g[i] !== null) continue;
      const cands = candidatesAt(g, i);
      if (cands.length === 0) return; // dead end
      if (!bestCands || cands.length < bestCands.length) {
        best = i;
        bestCands = cands;
        if (cands.length === 1) break;
      }
    }
    if (best === -1) {
      count += 1;
      return;
    }
    for (const v of bestCands) {
      g[best] = v;
      recurse();
      g[best] = null;
      if (count >= cap) return;
    }
  }
  recurse();
  return count;
}

// first solution found (MRV), or null; mutates a copy, not the input
export function solve(grid) {
  const g = grid.slice();
  function recurse() {
    let best = -1;
    let bestCands = null;
    for (let i = 0; i < 81; i++) {
      if (g[i] !== null) continue;
      const cands = candidatesAt(g, i);
      if (cands.length === 0) return false;
      if (!bestCands || cands.length < bestCands.length) {
        best = i;
        bestCands = cands;
        if (cands.length === 1) break;
      }
    }
    if (best === -1) return true;
    for (const v of bestCands) {
      g[best] = v;
      if (recurse()) return true;
      g[best] = null;
    }
    return false;
  }
  return recurse() ? g : null;
}

function shuffle(arr, rng) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function fillFull(rng) {
  const grid = Array(81).fill(null);
  function fill(i) {
    if (i === 81) return true;
    for (const v of shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9], rng)) {
      if (isValidPlacement(grid, i, v)) {
        grid[i] = v;
        if (fill(i + 1)) return true;
        grid[i] = null;
      }
    }
    return false;
  }
  fill(0);
  return grid;
}

export function generateSudoku(holes, rng = Math.random) {
  for (let attempt = 0; attempt < 40; attempt++) {
    const solution = fillFull(rng);
    const puzzle = solution.slice();
    let removed = 0;
    for (const i of shuffle([...Array(81).keys()], rng)) {
      if (removed >= holes) break;
      const saved = puzzle[i];
      puzzle[i] = null;
      if (solveCount(puzzle) === 1) removed += 1;
      else puzzle[i] = saved;
    }
    if (removed === holes) return { puzzle, solution };
  }
  throw new Error('sudoku: could not generate a unique puzzle');
}

export default {
  id: 'sudoku',
  name: 'Sudoku',
  icon: '🔢',
  blurb: 'Fill the grid, 1–9 in every row, box and column',
  freeChoice: true,
  scoreIsLowerBetter: true,
  levels: SUDOKU_LEVELS,
  mount(root, options) {
    const level = SUDOKU_LEVELS.find((l) => l.id === options.level) || SUDOKU_LEVELS[0];
    let { puzzle } = generateSudoku(level.holes);
    let givens = new Set(puzzle.map((v, i) => (v !== null ? i : -1)).filter((i) => i >= 0));
    let selected = null;
    let seconds = 0;
    let won = false;

    const hud = document.createElement('div');
    hud.className = 'hud';
    const grid = document.createElement('div');
    grid.className = 'sudoku-grid';
    const pad = document.createElement('div');
    pad.className = 'sudoku-pad';
    const overlay = document.createElement('div');
    overlay.className = 'overlay';
    overlay.hidden = true;
    root.append(hud, grid, pad, overlay);

    const cells = [];
    for (let i = 0; i < 81; i++) {
      const cell = document.createElement('button');
      cell.type = 'button';
      cell.className = 'sudoku-cell';
      cell.addEventListener('click', () => {
        selected = i;
        draw();
      });
      grid.appendChild(cell);
      cells.push(cell);
    }

    function conflicts() {
      const bad = new Set();
      for (let i = 0; i < 81; i++) {
        if (puzzle[i] !== null && !isValidPlacement(puzzle, i, puzzle[i])) bad.add(i);
      }
      return bad;
    }

    function isCompleteAndValid() {
      for (let i = 0; i < 81; i++) {
        if (puzzle[i] === null || !isValidPlacement(puzzle, i, puzzle[i])) return false;
      }
      return true;
    }

    function draw() {
      hud.textContent = `${level.label} — ${seconds}s`;
      const bad = conflicts();
      cells.forEach((cell, i) => {
        cell.textContent = puzzle[i] === null ? '' : String(puzzle[i]);
        cell.className = 'sudoku-cell';
        if (bad.has(i)) cell.className += ' conflict';
        if (givens.has(i)) cell.className += ' given';
        if (i === selected) cell.className += ' selected';
        if ((Math.floor(i / 9) % 3 === 0)) cell.className += ' band-top';
        if ((i % 9) % 3 === 0) cell.className += ' band-left';
      });
    }

    function setValue(v) {
      if (selected === null || won || givens.has(selected)) return; // printed clues are immutable
      puzzle[selected] = v;
      if (isCompleteAndValid()) {
        won = true;
        options.onCleared(level.id);
        options.onScore(seconds);
        overlay.innerHTML = '';
        overlay.className = 'overlay';
        overlay.hidden = false;
        const h = document.createElement('h2');
        h.textContent = `Solved in ${seconds}s`;
        const btn = document.createElement('button');
        btn.className = 'btn';
        btn.textContent = 'New puzzle';
        btn.addEventListener('click', () => mountAgain());
        overlay.append(h, btn);
      }
      draw();
    }

    function mountAgain() {
      overlay.hidden = true;
      won = false;
      seconds = 0;
      selected = null;
      puzzle = generateSudoku(level.holes).puzzle;
      givens = new Set(puzzle.map((v, i) => (v !== null ? i : -1)).filter((i) => i >= 0));
      draw();
    }

    for (let v = 1; v <= 9; v++) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'btn';
      b.textContent = String(v);
      b.addEventListener('click', () => setValue(v));
      pad.appendChild(b);
    }
    const clearBtn = document.createElement('button');
    clearBtn.type = 'button';
    clearBtn.className = 'btn';
    clearBtn.textContent = '⌫';
    clearBtn.addEventListener('click', () => setValue(null));
    pad.appendChild(clearBtn);

    function onKey(e) {
      if (won) return;
      if (e.key >= '1' && e.key <= '9') setValue(Number(e.key));
      else if (e.key === 'Backspace' || e.key === 'Delete') setValue(null);
    }
    window.addEventListener('keydown', onKey);
    const timer = setInterval(() => {
      if (!won) {
        seconds += 1;
        draw();
      }
    }, 1000);
    draw();

    return () => {
      clearInterval(timer);
      window.removeEventListener('keydown', onKey);
    };
  },
};
