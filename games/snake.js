// placeholder — replaced by the real Snake game in Task 4
export default {
  id: 'snake',
  name: 'Snake',
  icon: '🐍',
  blurb: 'Eat, grow, don\'t bite yourself',
  levels: [
    { id: 1, label: 'Level 1 — coming soon' },
    { id: 2, label: 'Level 2 — coming soon' },
  ],
  mount(root, options) {
    root.insertAdjacentHTML('beforeend', '<p>Coming soon…</p>');
    const clear = document.createElement('button');
    clear.className = 'btn';
    clear.textContent = 'clear';
    clear.addEventListener('click', () => options.onCleared(options.level));
    root.appendChild(clear);
    return () => {};
  },
};
