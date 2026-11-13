import test from 'node:test';
import assert from 'node:assert/strict';
import { games } from '../js/app.js';

test('every game descriptor has the full contract', () => {
  assert.ok(games.length >= 3);
  for (const g of games) {
    assert.ok(g.id && g.name && g.icon && g.blurb);
    assert.ok(Array.isArray(g.levels) && g.levels.length > 0);
    assert.equal(typeof g.mount, 'function');
    for (const l of g.levels) assert.equal(typeof l.id, 'number');
  }
});

test('game ids are unique', () => {
  assert.equal(new Set(games.map(g => g.id)).size, games.length);
});
