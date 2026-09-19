/**
 * Training statistics persisted in localStorage (no backend in the MVP).
 *
 * The record carries a schemaVersion. v1 (modes only) migrates to v2 which
 * adds per-level, per-skill and per-day aggregates, the dealer profile and
 * scores. Everything is plain JSON so a later move to Supabase is a matter of
 * syncing this object (see `StorageLike`: any get/set/remove backend works).
 */
import { MODES, type Mode, type SkillId } from "@/engine/scenarioGenerator";
import { LEVELS, type Level } from "@/engine/rating";
import { SKILLS } from "@/engine/skills";

export const STATS_STORAGE_KEY = "nlh-dealer-trainer.stats";
export const STATS_SCHEMA_VERSION = 2;
const RECENT_LIMIT = 100;
const DAYS_LIMIT = 120;

export type Experience = "none" | "lt3m" | "3to12m" | "gt1y";
export const EXPERIENCES: { id: Experience; label: string; level: Level }[] = [
  { id: "none", label: "未経験", level: 1 },
  { id: "lt3m", label: "〜3ヶ月", level: 2 },
  { id: "3to12m", label: "3〜12ヶ月", level: 3 },
  { id: "gt1y", label: "1年以上", level: 4 },
];

export function initialLevel(exp: Experience | null): Level {
  return EXPERIENCES.find((e) => e.id === exp)?.level ?? 1;
}

export interface Agg {
  attempts: number;
  correct: number;
  totalTimeMs: number;
  /** Sum of the level of every attempt (average level = levelSum / attempts). */
  levelSum: number;
  score: number;
}

export interface AttemptRecord {
  ts: number;
  correct: boolean;
  timeMs: number;
  seed: number;
  level: Level;
  score: number;
}

export interface ModeStats extends Agg {
  currentStreak: number;
  bestStreak: number;
  levels: Record<Level, Agg>;
  recent: AttemptRecord[];
}

export interface Profile {
  experience: Experience | null;
  /** Preferred level per mode (initialised from experience, then adjusted). */
  levels: Record<Mode, Level>;
  onboarded: boolean;
}

export interface Stats {
  schemaVersion: typeof STATS_SCHEMA_VERSION;
  updatedAt: number;
  profile: Profile;
  totals: Agg & { currentStreak: number; bestStreak: number };
  modes: Record<Mode, ModeStats>;
  skills: Partial<Record<SkillId, Agg>>;
  /** Local calendar day (YYYY-MM-DD) → aggregate. */
  days: Record<string, Agg>;
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function emptyAgg(): Agg {
  return { attempts: 0, correct: 0, totalTimeMs: 0, levelSum: 0, score: 0 };
}

export function emptyModeStats(): ModeStats {
  const levels = {} as Record<Level, Agg>;
  for (const l of LEVELS) levels[l] = emptyAgg();
  return { ...emptyAgg(), currentStreak: 0, bestStreak: 0, levels, recent: [] };
}

export function emptyProfile(): Profile {
  const levels = {} as Record<Mode, Level>;
  for (const m of MODES) levels[m] = 1;
  return { experience: null, levels, onboarded: false };
}

export function emptyStats(now = Date.now()): Stats {
  const modes = {} as Record<Mode, ModeStats>;
  for (const m of MODES) modes[m] = emptyModeStats();
  return {
    schemaVersion: STATS_SCHEMA_VERSION,
    updatedAt: now,
    profile: emptyProfile(),
    totals: { ...emptyAgg(), currentStreak: 0, bestStreak: 0 },
    modes,
    skills: {},
    days: {},
  };
}

/** Local calendar day key. */
export function dayKey(ts: number): string {
  const d = new Date(ts);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

// ---------------------------------------------------------------------------
// parsing / migration

const isNum = (x: unknown): x is number => typeof x === "number" && Number.isFinite(x);

function parseAgg(x: unknown): Agg {
  const o = (x && typeof x === "object" ? x : {}) as Record<string, unknown>;
  const a = emptyAgg();
  for (const k of Object.keys(a) as (keyof Agg)[]) if (isNum(o[k])) a[k] = Math.max(0, o[k] as number);
  return a;
}

function parseRecent(x: unknown): AttemptRecord[] {
  if (!Array.isArray(x)) return [];
  return x
    .filter((r): r is Record<string, unknown> => !!r && typeof r === "object" && typeof (r as AttemptRecord).correct === "boolean")
    .map((r) => ({
      ts: isNum(r.ts) ? r.ts : 0,
      correct: r.correct as boolean,
      timeMs: isNum(r.timeMs) ? r.timeMs : 0,
      seed: isNum(r.seed) ? r.seed : 0,
      level: (LEVELS as readonly number[]).includes(r.level as number) ? (r.level as Level) : 1,
      score: isNum(r.score) ? r.score : 0,
    }))
    .slice(-RECENT_LIMIT);
}

function parseModeStats(x: unknown): ModeStats {
  const o = (x && typeof x === "object" ? x : {}) as Record<string, unknown>;
  const ms = emptyModeStats();
  Object.assign(ms, parseAgg(o));
  if (isNum(o.currentStreak)) ms.currentStreak = o.currentStreak;
  if (isNum(o.bestStreak)) ms.bestStreak = o.bestStreak;
  const levels = (o.levels ?? {}) as Record<string, unknown>;
  for (const l of LEVELS) ms.levels[l] = parseAgg(levels[String(l)]);
  ms.recent = parseRecent(o.recent);
  return ms;
}

/** v1 → v2: per-mode totals carry over; every old attempt is assumed to be level 1. */
function migrateV1(obj: Record<string, unknown>, now: number): Stats {
  const out = emptyStats(isNum(obj.updatedAt) ? obj.updatedAt : now);
  const modes = (obj.modes ?? {}) as Record<string, unknown>;
  for (const m of MODES) {
    const src = (modes[m] ?? {}) as Record<string, unknown>;
    const ms = emptyModeStats();
    ms.attempts = isNum(src.attempts) ? src.attempts : 0;
    ms.correct = isNum(src.correct) ? src.correct : 0;
    ms.totalTimeMs = isNum(src.totalTimeMs) ? src.totalTimeMs : 0;
    ms.currentStreak = isNum(src.currentStreak) ? src.currentStreak : 0;
    ms.bestStreak = isNum(src.bestStreak) ? src.bestStreak : 0;
    ms.levelSum = ms.attempts; // level 1
    ms.levels[1] = { attempts: ms.attempts, correct: ms.correct, totalTimeMs: ms.totalTimeMs, levelSum: ms.attempts, score: 0 };
    ms.recent = parseRecent(src.recent);
    out.modes[m] = ms;
    out.totals.attempts += ms.attempts;
    out.totals.correct += ms.correct;
    out.totals.totalTimeMs += ms.totalTimeMs;
    out.totals.levelSum += ms.levelSum;
    out.totals.bestStreak = Math.max(out.totals.bestStreak, ms.bestStreak);
  }
  return out;
}

/**
 * Parse stored JSON. v1 is migrated, v2 validated field by field, anything
 * else is discarded so a corrupted record can never break the UI.
 */
export function parseStats(raw: string | null, now = Date.now()): Stats {
  if (!raw) return emptyStats(now);
  let data: unknown;
  try { data = JSON.parse(raw); } catch { return emptyStats(now); }
  if (!data || typeof data !== "object") return emptyStats(now);
  const obj = data as Record<string, unknown>;
  if (obj.schemaVersion === 1) return migrateV1(obj, now);
  if (obj.schemaVersion !== STATS_SCHEMA_VERSION) return emptyStats(now);

  const out = emptyStats(isNum(obj.updatedAt) ? obj.updatedAt : now);
  const modes = (obj.modes ?? {}) as Record<string, unknown>;
  for (const m of MODES) if (modes[m]) out.modes[m] = parseModeStats(modes[m]);
  const totals = (obj.totals ?? {}) as Record<string, unknown>;
  out.totals = { ...parseAgg(totals), currentStreak: isNum(totals.currentStreak) ? totals.currentStreak : 0, bestStreak: isNum(totals.bestStreak) ? totals.bestStreak : 0 };
  const skills = (obj.skills ?? {}) as Record<string, unknown>;
  for (const k of Object.keys(skills)) if (k in SKILLS) out.skills[k as SkillId] = parseAgg(skills[k]);
  const days = (obj.days ?? {}) as Record<string, unknown>;
  for (const k of Object.keys(days).sort().slice(-DAYS_LIMIT)) if (/^\d{4}-\d{2}-\d{2}$/.test(k)) out.days[k] = parseAgg(days[k]);
  const profile = (obj.profile ?? {}) as Record<string, unknown>;
  const p = emptyProfile();
  if (EXPERIENCES.some((e) => e.id === profile.experience)) p.experience = profile.experience as Experience;
  p.onboarded = profile.onboarded === true;
  const levels = (profile.levels ?? {}) as Record<string, unknown>;
  for (const m of MODES) if ((LEVELS as readonly number[]).includes(levels[m] as number)) p.levels[m] = levels[m] as Level;
  out.profile = p;
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

// ---------------------------------------------------------------------------
// updates (pure)

export interface AttemptInput {
  mode: Mode;
  level: Level;
  skills: readonly SkillId[];
  correct: boolean;
  timeMs: number;
  seed: number;
  score: number;
  ts?: number;
}

function addAgg(a: Agg, inp: AttemptInput): Agg {
  return {
    attempts: a.attempts + 1,
    correct: a.correct + (inp.correct ? 1 : 0),
    totalTimeMs: a.totalTimeMs + Math.max(0, inp.timeMs),
    levelSum: a.levelSum + inp.level,
    score: a.score + inp.score,
  };
}

/** Pure update: returns a new Stats with one attempt recorded everywhere it counts. */
export function recordAttempt(stats: Stats, inp: AttemptInput): Stats {
  const ts = inp.ts ?? Date.now();
  const prev = stats.modes[inp.mode] ?? emptyModeStats();
  const currentStreak = inp.correct ? prev.currentStreak + 1 : 0;
  const mode: ModeStats = {
    ...prev,
    ...addAgg(prev, inp),
    currentStreak,
    bestStreak: Math.max(prev.bestStreak, currentStreak),
    levels: { ...prev.levels, [inp.level]: addAgg(prev.levels[inp.level] ?? emptyAgg(), inp) },
    recent: [...prev.recent, { ts, correct: inp.correct, timeMs: inp.timeMs, seed: inp.seed, level: inp.level, score: inp.score }].slice(-RECENT_LIMIT),
  };
  const totalStreak = inp.correct ? stats.totals.currentStreak + 1 : 0;
  const totals = { ...addAgg(stats.totals, inp), currentStreak: totalStreak, bestStreak: Math.max(stats.totals.bestStreak, totalStreak) };
  const skills = { ...stats.skills };
  for (const s of inp.skills) skills[s] = addAgg(skills[s] ?? emptyAgg(), inp);
  const key = dayKey(ts);
  const days = { ...stats.days, [key]: addAgg(stats.days[key] ?? emptyAgg(), inp) };
  const keys = Object.keys(days).sort();
  for (const k of keys.slice(0, Math.max(0, keys.length - DAYS_LIMIT))) delete days[k];
  return { ...stats, updatedAt: ts, totals, modes: { ...stats.modes, [inp.mode]: mode }, skills, days };
}

export function setProfile(stats: Stats, patch: Partial<Profile>): Stats {
  return { ...stats, updatedAt: Date.now(), profile: { ...stats.profile, ...patch, levels: { ...stats.profile.levels, ...(patch.levels ?? {}) } } };
}

export function setExperience(stats: Stats, experience: Experience): Stats {
  const level = initialLevel(experience);
  const levels = {} as Record<Mode, Level>;
  for (const m of MODES) levels[m] = level;
  return setProfile(stats, { experience, levels, onboarded: true });
}

// ---------------------------------------------------------------------------
// derived numbers

export function accuracy(a: Agg): number | null {
  return a.attempts === 0 ? null : a.correct / a.attempts;
}

export function averageTimeMs(a: Agg): number | null {
  return a.attempts === 0 ? null : a.totalTimeMs / a.attempts;
}

export function recentAccuracy(ms: ModeStats, n = 20): number | null {
  const r = ms.recent.slice(-n);
  if (r.length === 0) return null;
  return r.filter((x) => x.correct).length / r.length;
}

export function todayAgg(stats: Stats, now = Date.now()): Agg {
  return stats.days[dayKey(now)] ?? emptyAgg();
}

export interface SkillReport {
  id: SkillId;
  label: string;
  labelJa: string;
  mode: Mode;
  attempts: number;
  accuracy: number;
}

/** Skills with enough data, weakest first. */
export function skillReports(stats: Stats, minAttempts = 4): SkillReport[] {
  const out: SkillReport[] = [];
  for (const [id, agg] of Object.entries(stats.skills) as [SkillId, Agg][]) {
    if (!agg || agg.attempts < minAttempts) continue;
    const info = SKILLS[id];
    out.push({ id, label: info.label, labelJa: info.labelJa, mode: info.mode, attempts: agg.attempts, accuracy: agg.correct / agg.attempts });
  }
  return out.sort((a, b) => a.accuracy - b.accuracy || b.attempts - a.attempts);
}

/** Weakest skills (accuracy under `threshold`), for the generator's weak-skill bias. */
export function weakSkills(stats: Stats, threshold = 0.85, limit = 4): SkillId[] {
  return skillReports(stats).filter((r) => r.accuracy < threshold).slice(0, limit).map((r) => r.id);
}

export interface Recommendation {
  modes: Mode[];
  skills: SkillReport[];
}

/** WEAKNESS TRAINING: which modes / skills to recommend next. */
export function recommendedTraining(stats: Stats): Recommendation {
  const skills = skillReports(stats).filter((r) => r.accuracy < 0.85).slice(0, 3);
  const modeAcc = MODES.map((m) => ({ mode: m, acc: accuracy(stats.modes[m]), attempts: stats.modes[m].attempts }));
  const untrained = modeAcc.filter((m) => m.attempts < 5).map((m) => m.mode);
  const weak = modeAcc.filter((m) => m.acc !== null && m.attempts >= 5 && m.acc < 0.85).sort((a, b) => a.acc! - b.acc!).map((m) => m.mode);
  const modes = [...new Set([...weak, ...skills.map((s) => s.mode), ...untrained])].slice(0, 2);
  return { modes, skills };
}

/** Mode weights for QUICK TRAINING: weak or untrained modes come up more often. */
export function quickModeWeights(stats: Stats): Record<Mode, number> {
  const out = {} as Record<Mode, number>;
  for (const m of MODES) {
    const acc = accuracy(stats.modes[m]);
    out[m] = acc === null ? 2 : 1 + (1 - acc) * 3;
  }
  return out;
}
