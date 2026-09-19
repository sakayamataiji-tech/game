/**
 * Session bookkeeping (pure): configuration, per-question records and the
 * SESSION RESULT summary. Nothing here touches storage.
 */
import type { Mode, SkillId } from "@/engine/scenarioGenerator";
import { Level } from "@/engine/rating";
import { SKILLS } from "@/engine/skills";

export type SessionLength = 10 | 25 | 50 | "endless";
export const SESSION_LENGTHS: readonly SessionLength[] = [10, 25, 50, "endless"];
export type TrainMode = Mode | "quick";
export type LevelSetting = Level | "auto";

export interface SessionConfig {
  train: TrainMode;
  length: SessionLength;
  level: LevelSetting;
}

export interface SessionAttempt {
  mode: Mode;
  level: Level;
  skills: readonly SkillId[];
  correct: boolean;
  timeMs: number;
  score: number;
}

export interface SessionSummary {
  total: number;
  correct: number;
  accuracy: number | null;
  avgTimeMs: number | null;
  bestStreak: number;
  score: number;
  /** Weakest skill in this session (needs 2+ attempts), else weakest mode. */
  weakest: { kind: "skill"; id: SkillId; label: string; labelJa: string; accuracy: number } | { kind: "mode"; mode: Mode; accuracy: number } | null;
}

export function summarizeSession(attempts: readonly SessionAttempt[]): SessionSummary {
  const total = attempts.length;
  const correct = attempts.filter((a) => a.correct).length;
  let best = 0, cur = 0;
  for (const a of attempts) { cur = a.correct ? cur + 1 : 0; best = Math.max(best, cur); }
  const score = attempts.reduce((s, a) => s + a.score, 0);
  const avgTimeMs = total ? attempts.reduce((s, a) => s + a.timeMs, 0) / total : null;

  const bySkill = new Map<SkillId, { n: number; c: number }>();
  const byMode = new Map<Mode, { n: number; c: number }>();
  for (const a of attempts) {
    for (const s of a.skills) {
      const e = bySkill.get(s) ?? { n: 0, c: 0 };
      e.n++; if (a.correct) e.c++;
      bySkill.set(s, e);
    }
    const m = byMode.get(a.mode) ?? { n: 0, c: 0 };
    m.n++; if (a.correct) m.c++;
    byMode.set(a.mode, m);
  }
  let weakest: SessionSummary["weakest"] = null;
  const skillRows = [...bySkill.entries()].filter(([, e]) => e.n >= 2).map(([id, e]) => ({ id, acc: e.c / e.n, n: e.n })).sort((a, b) => a.acc - b.acc || b.n - a.n);
  if (skillRows.length > 0 && skillRows[0].acc < 1) {
    const r = skillRows[0];
    weakest = { kind: "skill", id: r.id, label: SKILLS[r.id].label, labelJa: SKILLS[r.id].labelJa, accuracy: r.acc };
  } else {
    const modeRows = [...byMode.entries()].map(([mode, e]) => ({ mode, acc: e.c / e.n })).sort((a, b) => a.acc - b.acc);
    if (modeRows.length > 0 && modeRows[0].acc < 1) weakest = { kind: "mode", mode: modeRows[0].mode, accuracy: modeRows[0].acc };
  }
  return { total, correct, accuracy: total ? correct / total : null, avgTimeMs, bestStreak: best, score, weakest };
}

/**
 * AUTO difficulty: three correct in a row moves up a level, two misses in a
 * row moves down. Returns the level for the NEXT question.
 */
export function nextAutoLevel(level: Level, recent: readonly boolean[]): Level {
  const last3 = recent.slice(-3);
  const last2 = recent.slice(-2);
  if (last3.length === 3 && last3.every(Boolean)) return Math.min(5, level + 1) as Level;
  if (last2.length === 2 && last2.every((x) => !x)) return Math.max(1, level - 1) as Level;
  return level;
}

export function isSessionOver(cfg: SessionConfig, answered: number): boolean {
  return cfg.length !== "endless" && answered >= cfg.length;
}
