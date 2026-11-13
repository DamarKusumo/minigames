// placeholder — replaced by the real Bounce game in Task 6
export default {
  id: 'bounce',
  name: 'Bounce',
  icon: '🧱',
  blurb: 'Break every brick',
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
