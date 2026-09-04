import { hashString } from './rng.js';

// Day 1 is the launch date. Puzzle numbers count up from there like Wordle's "#123".
export const LAUNCH_DATE = '2026-09-04';
const MS_PER_DAY = 86400000;

/** Local-date key "YYYY-MM-DD" (players in Japan get the new puzzle at local midnight). */
export function dateKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function utcDays(key) {
  const [y, m, d] = key.split('-').map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / MS_PER_DAY);
}

export function puzzleNumber(key) {
  return utcDays(key) - utcDays(LAUNCH_DATE) + 1;
}

export function dailySeed(key) {
  return hashString(`blockle-daily-${key}`);
}

/** Difficulty ramps gently through the week: weekends get a bigger board. */
export function dailyOptions(key) {
  const [y, m, d] = key.split('-').map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  if (dow === 0 || dow === 6) return { size: 7, minPiece: 4, maxPiece: 6 };
  return { size: 6, minPiece: 3, maxPiece: 5 };
}

export function endlessSeed(counter) {
  return hashString(`blockle-endless-${Date.now()}-${counter}-${Math.random()}`);
}
