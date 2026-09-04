// Thin localStorage wrapper. Everything is best-effort: private browsing or a
// blocked storage API must never break the game.
const KEY = 'blockle:v1';

const defaults = () => ({
  daily: {},            // dateKey -> { timeMs, moves, hints, placements }
  streak: { count: 0, lastKey: null },
  endlessSolved: 0,
  lang: null,
});

export function loadState() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaults();
    return { ...defaults(), ...JSON.parse(raw) };
  } catch {
    return defaults();
  }
}

export function saveState(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

export function previousDateKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d) - 86400000);
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`;
}

/** Record a daily solve and update the streak. Returns the new streak count. */
export function recordDailySolve(state, key, result) {
  if (!state.daily[key]) {
    const s = state.streak;
    if (s.lastKey === previousDateKey(key)) s.count += 1;
    else if (s.lastKey !== key) s.count = 1;
    s.lastKey = key;
  }
  state.daily[key] = result;
  saveState(state);
  return state.streak.count;
}
