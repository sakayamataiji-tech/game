import { describe, it, expect } from "vitest";
import {
  parseStats, recordAttempt, emptyStats, loadStats, saveStats, clearStats, STATS_SCHEMA_VERSION, STATS_STORAGE_KEY, accuracy, recentAccuracy,
  StorageLike, todayAgg, dayKey, weakSkills, recommendedTraining, quickModeWeights, setExperience, initialLevel, AttemptInput,
} from "@/lib/stats";

function memoryStorage(): StorageLike & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => { data.set(k, v); },
    removeItem: (k) => { data.delete(k); },
  };
}

const attempt = (over: Partial<AttemptInput> = {}): AttemptInput => ({
  mode: "pot", level: 2, skills: ["preflop-pot"], correct: true, timeMs: 1000, seed: 1, score: 130, ts: 10, ...over,
});

describe("stats v2", () => {
  it("starts empty with the current schema version", () => {
    const s = emptyStats(1);
    expect(s.schemaVersion).toBe(STATS_SCHEMA_VERSION);
    expect(Object.keys(s.modes).sort()).toEqual(["hand-reading", "pot", "side-pot", "winner"]);
    expect(s.profile.onboarded).toBe(false);
  });
  it("records attempts into mode, level, skill, day and total aggregates without mutating the input", () => {
    const s0 = emptyStats(1);
    const s1 = recordAttempt(s0, attempt());
    const s2 = recordAttempt(s1, attempt({ timeMs: 3000, seed: 2, ts: 11, level: 3, skills: ["preflop-pot", "uncalled-bet"] }));
    const s3 = recordAttempt(s2, attempt({ correct: false, timeMs: 500, seed: 3, ts: 12, score: 0 }));
    expect(s0.modes.pot.attempts).toBe(0);
    expect(s3.modes.pot).toMatchObject({ attempts: 3, correct: 2, currentStreak: 0, bestStreak: 2, totalTimeMs: 4500, levelSum: 7, score: 260 });
    expect(s3.modes.pot.levels[2].attempts).toBe(2);
    expect(s3.modes.pot.levels[3].attempts).toBe(1);
    expect(s3.skills["preflop-pot"]!.attempts).toBe(3);
    expect(s3.skills["uncalled-bet"]!.attempts).toBe(1);
    expect(s3.totals).toMatchObject({ attempts: 3, correct: 2, bestStreak: 2, currentStreak: 0 });
    expect(s3.days[dayKey(10)].attempts).toBe(3);
    expect(accuracy(s3.modes.pot)).toBeCloseTo(2 / 3);
    expect(recentAccuracy(s3.modes.pot, 1)).toBe(0);
    expect(s3.modes.winner.attempts).toBe(0);
  });
  it("round-trips through storage", () => {
    const st = memoryStorage();
    const s = recordAttempt(emptyStats(1), attempt({ mode: "winner", skills: ["split-pot"] }));
    saveStats(st, s);
    expect(st.data.has(STATS_STORAGE_KEY)).toBe(true);
    expect(loadStats(st)).toEqual(s);
    clearStats(st);
    expect(loadStats(st, 7)).toEqual(emptyStats(7));
  });
  it("migrates a v1 record (mode totals only) into v2", () => {
    const v1 = { schemaVersion: 1, updatedAt: 5, modes: { pot: { attempts: 4, correct: 3, currentStreak: 1, bestStreak: 2, totalTimeMs: 4000, recent: [{ ts: 1, correct: true, timeMs: 1000, seed: 9 }] } } };
    const s = parseStats(JSON.stringify(v1), 3);
    expect(s.schemaVersion).toBe(2);
    expect(s.modes.pot).toMatchObject({ attempts: 4, correct: 3, bestStreak: 2, levelSum: 4 });
    expect(s.modes.pot.levels[1].attempts).toBe(4);
    expect(s.modes.pot.recent[0]).toMatchObject({ seed: 9, level: 1, score: 0 });
    expect(s.totals.attempts).toBe(4);
    expect(s.updatedAt).toBe(5);
  });
  it("discards unknown schema versions and corrupted records", () => {
    expect(parseStats(JSON.stringify({ schemaVersion: 999, modes: {} }), 3)).toEqual(emptyStats(3));
    expect(parseStats("{not json", 3)).toEqual(emptyStats(3));
    expect(parseStats(JSON.stringify({ schemaVersion: 2, modes: { pot: { attempts: "x" } } }), 3).modes.pot.attempts).toBe(0);
    const partial = parseStats(JSON.stringify({ schemaVersion: 2, updatedAt: 2, modes: { pot: { attempts: 2, correct: 1, recent: [null, { ts: 1, correct: true, timeMs: 1, seed: 1 }] } }, skills: { bogus: { attempts: 1 }, "side-pot": { attempts: 2, correct: 1 } }, days: { nope: {}, "2026-01-01": { attempts: 1 } } }), 3);
    expect(partial.modes.pot.attempts).toBe(2);
    expect(partial.modes.pot.recent.length).toBe(1);
    expect(partial.skills["side-pot"]!.attempts).toBe(2);
    expect(Object.keys(partial.skills)).toEqual(["side-pot"]);
    expect(Object.keys(partial.days)).toEqual(["2026-01-01"]);
  });
  it("caps the recent history", () => {
    let s = emptyStats(1);
    for (let i = 0; i < 150; i++) s = recordAttempt(s, attempt({ mode: "hand-reading", skills: [], seed: i, ts: i }));
    expect(s.modes["hand-reading"].recent.length).toBe(100);
    expect(s.modes["hand-reading"].attempts).toBe(150);
  });
  it("survives a storage that throws", () => {
    const bad: StorageLike = { getItem: () => { throw new Error("nope"); }, setItem: () => { throw new Error("nope"); }, removeItem: () => { throw new Error("nope"); } };
    expect(loadStats(bad, 1)).toEqual(emptyStats(1));
    expect(() => saveStats(bad, emptyStats(1))).not.toThrow();
    expect(() => clearStats(bad)).not.toThrow();
  });
  it("today's aggregate uses the local day", () => {
    const now = Date.now();
    const s = recordAttempt(emptyStats(1), attempt({ ts: now }));
    expect(todayAgg(s, now).attempts).toBe(1);
    expect(todayAgg(s, now + 3 * 24 * 3600 * 1000).attempts).toBe(0);
  });
  it("finds weak skills and recommends training", () => {
    let s = emptyStats(1);
    for (let i = 0; i < 10; i++) s = recordAttempt(s, attempt({ mode: "side-pot", skills: ["side-pot", "multiple-side-pots"], correct: i < 6, ts: i }));
    for (let i = 0; i < 10; i++) s = recordAttempt(s, attempt({ mode: "winner", skills: ["flush-comparison"], correct: true, ts: 100 + i }));
    expect(weakSkills(s)).toEqual(["side-pot", "multiple-side-pots"]);
    const rec = recommendedTraining(s);
    expect(rec.modes[0]).toBe("side-pot");
    expect(rec.skills.map((r) => r.id)).toContain("side-pot");
    const w = quickModeWeights(s);
    expect(w["side-pot"]).toBeGreaterThan(w.winner);
    expect(w.pot).toBe(2); // untrained
  });
  it("experience sets the initial level and marks onboarding done", () => {
    expect(initialLevel(null)).toBe(1);
    expect(initialLevel("gt1y")).toBe(4);
    const s = setExperience(emptyStats(1), "3to12m");
    expect(s.profile.onboarded).toBe(true);
    expect(s.profile.levels.pot).toBe(3);
  });
});
