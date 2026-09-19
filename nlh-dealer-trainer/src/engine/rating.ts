/**
 * Scoring, speed feedback and DEALER RATING. Pure functions over aggregates so
 * the UI and tests share one definition.
 */
import type { Mode } from "./skills";

export type Level = 1 | 2 | 3 | 4 | 5;
export const LEVELS: readonly Level[] = [1, 2, 3, 4, 5];

export type SpeedFeedback = "FAST" | "NORMAL" | "SLOW";

/** Seconds: below `fast` is FAST, below `normal` is NORMAL, otherwise SLOW. */
export const SPEED_THRESHOLDS: Record<Mode, { fast: number; normal: number }> = {
  "hand-reading": { fast: 4, normal: 8 },
  winner: { fast: 6, normal: 12 },
  pot: { fast: 12, normal: 25 },
  "side-pot": { fast: 25, normal: 50 },
};

export function speedFeedback(mode: Mode, timeMs: number): SpeedFeedback {
  const t = SPEED_THRESHOLDS[mode];
  const s = timeMs / 1000;
  if (s < t.fast) return "FAST";
  if (s < t.normal) return "NORMAL";
  return "SLOW";
}

export interface ScoreBreakdown {
  base: number;
  speedBonus: number;
  streakBonus: number;
  total: number;
}

export const SPEED_BONUS: Record<SpeedFeedback, number> = { FAST: 30, NORMAL: 10, SLOW: 0 };
export const STREAK_BONUS_PER = 5;
export const STREAK_BONUS_CAP = 50;

/** Score for one answer. Wrong answers score 0 (accuracy first). `streak` is the streak AFTER this answer. */
export function scoreAnswer(correct: boolean, mode: Mode, timeMs: number, streak: number): ScoreBreakdown {
  if (!correct) return { base: 0, speedBonus: 0, streakBonus: 0, total: 0 };
  const base = 100;
  const speedBonus = SPEED_BONUS[speedFeedback(mode, timeMs)];
  const streakBonus = Math.min(STREAK_BONUS_CAP, Math.max(0, streak - 1) * STREAK_BONUS_PER);
  return { base, speedBonus, streakBonus, total: base + speedBonus + streakBonus };
}

export type Grade = "S" | "A" | "B" | "C" | "D" | "-";

export interface RatingInput {
  attempts: number;
  correct: number;
  totalTimeMs: number;
  /** Sum of level over attempts (so avg level = levelSum / attempts). */
  levelSum: number;
}

export interface RatingResult {
  points: number | null; // 0..100, null when not enough data
  grade: Grade;
  accuracy: number | null;
  avgTimeMs: number | null;
  avgLevel: number | null;
}

export const RATING_MIN_ATTEMPTS = 10;

/**
 * Rating points: accuracy dominates (70), speed (15) and difficulty (15).
 * Speed is measured against the mode's thresholds; difficulty is the average level.
 */
export function rateMode(mode: Mode, input: RatingInput): RatingResult {
  if (input.attempts === 0) return { points: null, grade: "-", accuracy: null, avgTimeMs: null, avgLevel: null };
  const accuracy = input.correct / input.attempts;
  const avgTimeMs = input.totalTimeMs / input.attempts;
  const avgLevel = input.levelSum / input.attempts;
  if (input.attempts < RATING_MIN_ATTEMPTS) return { points: null, grade: "-", accuracy, avgTimeMs, avgLevel };
  const t = SPEED_THRESHOLDS[mode];
  const s = avgTimeMs / 1000;
  const speedScore = s <= t.fast ? 1 : s >= t.normal * 2 ? 0 : 1 - (s - t.fast) / (t.normal * 2 - t.fast);
  const diffScore = (Math.min(5, Math.max(1, avgLevel)) - 1) / 4;
  const points = Math.round(accuracy * 70 + speedScore * 15 + diffScore * 15);
  return { points, grade: gradeOf(points), accuracy, avgTimeMs, avgLevel };
}

export function gradeOf(points: number): Grade {
  if (points >= 90) return "S";
  if (points >= 80) return "A";
  if (points >= 65) return "B";
  if (points >= 50) return "C";
  return "D";
}

/**
 * Overall rating is NOT the average of mode grades: it is computed from the
 * combined accuracy / speed / difficulty across all modes, so a dealer who
 * only drills the easy modes does not get an inflated overall grade.
 */
export function rateOverall(inputs: Record<Mode, RatingInput>): RatingResult {
  const modes = Object.keys(inputs) as Mode[];
  const attempts = modes.reduce((s, m) => s + inputs[m].attempts, 0);
  if (attempts === 0) return { points: null, grade: "-", accuracy: null, avgTimeMs: null, avgLevel: null };
  const correct = modes.reduce((s, m) => s + inputs[m].correct, 0);
  const accuracy = correct / attempts;
  const avgTimeMs = modes.reduce((s, m) => s + inputs[m].totalTimeMs, 0) / attempts;
  const avgLevel = modes.reduce((s, m) => s + inputs[m].levelSum, 0) / attempts;
  if (attempts < RATING_MIN_ATTEMPTS) return { points: null, grade: "-", accuracy, avgTimeMs, avgLevel };
  // Speed is normalised per mode, then weighted by that mode's attempts.
  let speedScore = 0;
  for (const m of modes) {
    const inp = inputs[m];
    if (inp.attempts === 0) continue;
    const t = SPEED_THRESHOLDS[m];
    const s = inp.totalTimeMs / inp.attempts / 1000;
    const sc = s <= t.fast ? 1 : s >= t.normal * 2 ? 0 : 1 - (s - t.fast) / (t.normal * 2 - t.fast);
    speedScore += sc * (inp.attempts / attempts);
  }
  // Coverage: training every mode counts; missing modes pull the overall down.
  const coverage = modes.filter((m) => inputs[m].attempts >= 5).length / modes.length;
  const diffScore = (Math.min(5, Math.max(1, avgLevel)) - 1) / 4;
  const points = Math.round((accuracy * 70 + speedScore * 15 + diffScore * 15) * (0.7 + 0.3 * coverage));
  return { points, grade: gradeOf(points), accuracy, avgTimeMs, avgLevel };
}
