// placeholder — replaced by the real Snake game in Task 4
export default {
  id: 'snake',
  name: 'Snake',
  icon: '🐍',
  blurb: 'Eat, grow, don\'t bite yourself',
  levels: [{ id: 1, label: 'Level 1 — coming soon' }],
  mount(root) {
    root.insertAdjacentHTML('beforeend', '<p>Coming soon…</p>');
    return () => {};
  },
};
