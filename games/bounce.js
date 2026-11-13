// placeholder — replaced by the real Bounce game in Task 6
export default {
  id: 'bounce',
  name: 'Bounce',
  icon: '🧱',
  blurb: 'Break every brick',
  levels: [{ id: 1, label: 'Level 1 — coming soon' }],
  mount(root) {
    root.insertAdjacentHTML('beforeend', '<p>Coming soon…</p>');
    return () => {};
  },
};
