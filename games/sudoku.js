// placeholder — replaced by the real Sudoku game in Task 5
export default {
  id: 'sudoku',
  name: 'Sudoku',
  icon: '🔢',
  blurb: 'Fill the grid, 1–9 in every row, box and column',
  freeChoice: true,
  levels: [{ id: 1, label: 'Easy — coming soon' }],
  mount(root) {
    root.insertAdjacentHTML('beforeend', '<p>Coming soon…</p>');
    return () => {};
  },
};
