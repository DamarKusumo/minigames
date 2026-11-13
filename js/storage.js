const memory = new Map();

function getStore() {
  try {
    const store = globalThis.localStorage;
    if (!store) throw new Error('no localStorage');
    return store;
  } catch {
    return {
      getItem: (k) => (memory.has(k) ? memory.get(k) : null),
      setItem: (k, v) => memory.set(k, String(v)),
      removeItem: (k) => memory.delete(k),
    };
  }
}

export function resetStorage() {
  memory.clear();
  try {
    globalThis.localStorage?.clear();
  } catch { /* private mode: memory-only anyway */ }
}

export function getHighScore(gameId, levelId) {
  const v = getStore().getItem(`minigames:${gameId}:high:${levelId}`);
  return v === null ? null : Number(v);
}

export function setHighScore(gameId, levelId, score) {
  getStore().setItem(`minigames:${gameId}:high:${levelId}`, String(score));
}

export function getUnlockedLevel(gameId) {
  const v = getStore().getItem(`minigames:${gameId}:unlocked`);
  return v === null ? 1 : Number(v);
}

export function setUnlockedLevel(gameId, level) {
  getStore().setItem(`minigames:${gameId}:unlocked`, String(level));
}
