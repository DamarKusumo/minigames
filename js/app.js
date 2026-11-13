import snake from '../games/snake.js';
import sudoku from '../games/sudoku.js';
import bounce from '../games/bounce.js';

export const games = [snake, sudoku, bounce];

let root;
let cleanup = null;

function clear() {
  if (cleanup) {
    cleanup();
    cleanup = null;
  }
  root.innerHTML = '';
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export function renderMenu() {
  clear();
  root.appendChild(el('h1', '', 'Retro Minigames'));
  const grid = el('div', 'card-grid');
  for (const game of games) {
    const card = el('div', 'card');
    card.tabIndex = 0;
    card.appendChild(el('div', 'icon', game.icon));
    card.appendChild(el('div', 'name', game.name));
    card.appendChild(el('div', 'blurb', game.blurb));
    const open = () => renderLevelSelect(game);
    card.addEventListener('click', open);
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        open();
      }
    });
    grid.appendChild(card);
  }
  root.appendChild(grid);
}

export function renderLevelSelect(game) {
  clear();
  const back = el('button', 'btn', '← Back');
  back.addEventListener('click', renderMenu);
  root.appendChild(back);
  root.appendChild(el('h2', '', game.name));
  const list = el('ul', 'level-list');
  for (const level of game.levels) {
    const item = el('li');
    const btn = el('button', '', level.label);
    btn.addEventListener('click', () => renderGame(game, level.id));
    item.appendChild(btn);
    list.appendChild(item);
  }
  root.appendChild(list);
}

export function renderGame(game, levelId) {
  clear();
  const back = el('button', 'btn', '← Levels');
  back.addEventListener('click', () => renderLevelSelect(game));
  root.appendChild(back);
  const container = el('div', 'game');
  root.appendChild(container);
  // onScore/onCleared wired to storage in Task 3
  cleanup = game.mount(container, {
    level: levelId,
    onScore() {},
    onCleared() {},
  });
}

export function boot(appRoot = document.getElementById('app')) {
  root = appRoot;
  renderMenu();
}

if (typeof document !== 'undefined') boot();
