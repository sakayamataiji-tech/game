/**
 * Training statistics persisted in localStorage (no backend in the MVP).
 * The record carries a schemaVersion so future shape changes can migrate or
 * discard old data explicitly instead of crashing on it.
 */
import type { Mode } from "@/engine/scenarioGenerator";
import { MODES } from "@/engine/scenarioGenerator";

export const STATS_STORAGE_KEY = "nlh-dealer-trainer.stats";
export const STATS_SCHEMA_VERSION = 1;
const RECENT_LIMIT = 100;

export interface AttemptRecord {
  ts: number;
  correct: boolean;
  timeMs: number;
  seed: number;
}

export interface ModeStats {
  attempts: number;
  correct: number;
  currentStreak: number;
  bestStreak: number;
  totalTimeMs: number;
  recent: AttemptRecord[];
}

export interface Stats {
  schemaVersion: typeof STATS_SCHEMA_VERSION;
  updatedAt: number;
  modes: Record<Mode, ModeStats>;
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function emptyModeStats(): ModeStats {
  return { attempts: 0, correct: 0, currentStreak: 0, bestStreak: 0, totalTimeMs: 0, recent: [] };
}

export function emptyStats(now = Date.now()): Stats {
  const modes = {} as Record<Mode, ModeStats>;
  for (const m of MODES) modes[m] = emptyModeStats();
  return { schemaVersion: STATS_SCHEMA_VERSION, updatedAt: now, modes };
}

function isModeStats(x: unknown): x is ModeStats {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return ["attempts", "correct", "currentStreak", "bestStreak", "totalTimeMs"].every((k) => typeof o[k] === "number")
    && Array.isArray(o.recent);
}

/**
 * Parse stored JSON. Unknown or newer schema versions are discarded (fresh
 * stats) rather than guessed at. Version 1 is validated field by field so a
 * corrupted record can never break the UI.
 */
export function parseStats(raw: string | null, now = Date.now()): Stats {
  if (!raw) return emptyStats(now);
  let data: unknown;
  try { data = JSON.parse(raw); } catch { return emptyStats(now); }
  if (!data || typeof data !== "object") return emptyStats(now);
  const obj = data as { schemaVersion?: unknown; modes?: unknown; updatedAt?: unknown };
  if (obj.schemaVersion !== STATS_SCHEMA_VERSION) return emptyStats(now); // migration point for future versions
  const out = emptyStats(typeof obj.updatedAt === "number" ? obj.updatedAt : now);
  const modes = (obj.modes ?? {}) as Record<string, unknown>;
  for (const m of MODES) {
    const ms = modes[m];
    if (isModeStats(ms)) {
      out.modes[m] = {
        ...ms,
        recent: ms.recent
          .filter((r): r is AttemptRecord => !!r && typeof r === "object" && typeof (r as AttemptRecord).correct === "boolean")
          .slice(-RECENT_LIMIT),
      };
    }
  }
  return out;
}

export function loadStats(storage: StorageLike | null | undefined, now = Date.now()): Stats {
  if (!storage) return emptyStats(now);
  try { return parseStats(storage.getItem(STATS_STORAGE_KEY), now); } catch { return emptyStats(now); }
}

export function saveStats(storage: StorageLike | null | undefined, stats: Stats): void {
  if (!storage) return;
  try { storage.setItem(STATS_STORAGE_KEY, JSON.stringify(stats)); } catch { /* quota / private mode: stats are best effort */ }
}

export function clearStats(storage: StorageLike | null | undefined): void {
  if (!storage) return;
  try { storage.removeItem(STATS_STORAGE_KEY); } catch { /* ignore */ }
}

/** Pure update: returns a new Stats with one attempt recorded. */
export function recordAttempt(stats: Stats, mode: Mode, attempt: Omit<AttemptRecord, "ts"> & { ts?: number }): Stats {
  const prev = stats.modes[mode] ?? emptyModeStats();
  const ts = attempt.ts ?? Date.now();
  const currentStreak = attempt.correct ? prev.currentStreak + 1 : 0;
  const next: ModeStats = {
    attempts: prev.attempts + 1,
    correct: prev.correct + (attempt.correct ? 1 : 0),
    currentStreak,
    bestStreak: Math.max(prev.bestStreak, currentStreak),
    totalTimeMs: prev.totalTimeMs + Math.max(0, attempt.timeMs),
    recent: [...prev.recent, { ts, correct: attempt.correct, timeMs: attempt.timeMs, seed: attempt.seed }].slice(-RECENT_LIMIT),
  };
  return { ...stats, updatedAt: ts, modes: { ...stats.modes, [mode]: next } };
}

export function accuracy(ms: ModeStats): number | null {
  return ms.attempts === 0 ? null : ms.correct / ms.attempts;
}

export function recentAccuracy(ms: ModeStats, n = 20): number | null {
  const r = ms.recent.slice(-n);
  if (r.length === 0) return null;
  return r.filter((x) => x.correct).length / r.length;
}

export function averageTimeMs(ms: ModeStats): number | null {
  return ms.attempts === 0 ? null : ms.totalTimeMs / ms.attempts;
}
