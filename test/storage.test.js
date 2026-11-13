import test from 'node:test';
import assert from 'node:assert/strict';
import { getHighScore, setHighScore, getUnlockedLevel, setUnlockedLevel, resetStorage } from '../js/storage.js';

test('high score round-trips', () => {
  resetStorage();
  setHighScore('snake', 3, 42);
  assert.equal(getHighScore('snake', 3), 42);
  assert.equal(getHighScore('snake', 4), null);
});

test('unlocked level defaults to 1 and round-trips', () => {
  resetStorage();
  assert.equal(getUnlockedLevel('bounce'), 1);
  setUnlockedLevel('bounce', 4);
  assert.equal(getUnlockedLevel('bounce'), 4);
});

test('plays when localStorage throws (private mode)', () => {
  resetStorage();
  const real = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    get() { throw new Error('denied'); },
  });
  assert.doesNotThrow(() => { setHighScore('snake', 1, 5); getUnlockedLevel('snake'); });
  if (real) Object.defineProperty(globalThis, 'localStorage', real);
  else delete globalThis.localStorage;
});
