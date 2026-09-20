/**
 * Game layer on top of the stats: XP / dealer rank, daily play streak and the
 * daily mission. Everything is derived from the persisted Stats, so no schema
 * change is needed and the numbers stay consistent with STATS / RATING.
 */
import { Agg, dayKey, Stats, todayAgg } from "./stats";

export interface Rank {
  index: number;
  title: string;
  titleJa: string;
  /** XP needed to reach this rank. */
  threshold: number;
}

export const RANKS: readonly Rank[] = [
  { index: 0, title: "ROOKIE", titleJa: "ルーキー", threshold: 0 },
  { index: 1, title: "TRAINEE", titleJa: "研修生", threshold: 1000 },
  { index: 2, title: "FLOOR DEALER", titleJa: "フロアディーラー", threshold: 3000 },
  { index: 3, title: "PRO DEALER", titleJa: "プロディーラー", threshold: 7000 },
  { index: 4, title: "TOURNAMENT DEALER", titleJa: "トーナメントディーラー", threshold: 15000 },
  { index: 5, title: "MASTER DEALER", titleJa: "マスターディーラー", threshold: 30000 },
];

export interface RankProgress {
  rank: Rank;
  next: Rank | null;
  xp: number;
  /** 0..1 progress toward the next rank (1 at max rank). */
  progress: number;
  /** XP still needed for the next rank (0 at max rank). */
  remaining: number;
}

/** XP is the total score earned; ranks are fixed thresholds. */
export function rankProgress(xp: number): RankProgress {
  const x = Math.max(0, Math.floor(xp));
  let rank = RANKS[0];
  for (const r of RANKS) if (x >= r.threshold) rank = r;
  const next = RANKS[rank.index + 1] ?? null;
  if (!next) return { rank, next, xp: x, progress: 1, remaining: 0 };
  const span = next.threshold - rank.threshold;
  return { rank, next, xp: x, progress: (x - rank.threshold) / span, remaining: next.threshold - x };
}

export function xpOf(stats: Stats): number {
  return stats.totals.score;
}

function shiftDay(key: string, delta: number): string {
  const [y, m, d] = key.split("-").map(Number);
  const dt = new Date(y, m - 1, d + delta);
  return dayKey(dt.getTime());
}

/**
 * Consecutive days with at least one answer, counting back from today (or
 * from yesterday when nothing was played yet today, so the streak is not
 * lost before the day is over).
 */
export function dayStreak(stats: Stats, now = Date.now()): number {
  const today = dayKey(now);
  const played = (k: string) => (stats.days[k]?.attempts ?? 0) > 0;
  let cursor = played(today) ? today : shiftDay(today, -1);
  let streak = 0;
  while (played(cursor)) {
    streak++;
    cursor = shiftDay(cursor, -1);
    if (streak > 3660) break;
  }
  return streak;
}

export interface Mission {
  id: string;
  title: string;
  target: number;
  done: number;
  complete: boolean;
}

export const DAILY_QUESTIONS = 10;
export const DAILY_CORRECT = 7;

/** Today's missions, derived from today's aggregate. */
export function dailyMissions(stats: Stats, now = Date.now()): Mission[] {
  const t: Agg = todayAgg(stats, now);
  const q = Math.min(DAILY_QUESTIONS, t.attempts);
  const c = Math.min(DAILY_CORRECT, t.correct);
  return [
    { id: "questions", title: `今日 ${DAILY_QUESTIONS} 問プレイ`, target: DAILY_QUESTIONS, done: q, complete: q >= DAILY_QUESTIONS },
    { id: "correct", title: `今日 ${DAILY_CORRECT} 問正解`, target: DAILY_CORRECT, done: c, complete: c >= DAILY_CORRECT },
  ];
}

/** Combo label shown in the feedback when the streak is worth celebrating. */
export function comboLabel(streak: number): string | null {
  if (streak >= 10) return "UNSTOPPABLE";
  if (streak >= 5) return "ON FIRE";
  if (streak >= 3) return "COMBO";
  return null;
}
