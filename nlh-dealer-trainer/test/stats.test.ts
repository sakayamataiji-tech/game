import { describe, it, expect } from "vitest";
import {
  parseStats, recordAttempt, emptyStats, loadStats, saveStats, clearStats, STATS_SCHEMA_VERSION, STATS_STORAGE_KEY, accuracy, recentAccuracy, StorageLike,
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

describe("stats", () => {
  it("starts empty with the current schema version", () => {
    const s = emptyStats(1);
    expect(s.schemaVersion).toBe(STATS_SCHEMA_VERSION);
    expect(Object.keys(s.modes).sort()).toEqual(["hand-reading", "pot", "side-pot", "winner"]);
  });
  it("records attempts, streaks and accuracy without mutating the input", () => {
    const s0 = emptyStats(1);
    const s1 = recordAttempt(s0, "pot", { correct: true, timeMs: 1000, seed: 1, ts: 10 });
    const s2 = recordAttempt(s1, "pot", { correct: true, timeMs: 3000, seed: 2, ts: 11 });
    const s3 = recordAttempt(s2, "pot", { correct: false, timeMs: 500, seed: 3, ts: 12 });
    expect(s0.modes.pot.attempts).toBe(0);
    expect(s3.modes.pot).toMatchObject({ attempts: 3, correct: 2, currentStreak: 0, bestStreak: 2, totalTimeMs: 4500 });
    expect(s3.modes.pot.recent.length).toBe(3);
    expect(accuracy(s3.modes.pot)).toBeCloseTo(2 / 3);
    expect(recentAccuracy(s3.modes.pot, 1)).toBe(0);
    expect(s3.modes.winner.attempts).toBe(0);
  });
  it("round-trips through storage", () => {
    const st = memoryStorage();
    const s = recordAttempt(emptyStats(1), "winner", { correct: true, timeMs: 10, seed: 9, ts: 5 });
    saveStats(st, s);
    expect(st.data.has(STATS_STORAGE_KEY)).toBe(true);
    expect(loadStats(st)).toEqual(s);
    clearStats(st);
    expect(loadStats(st, 7)).toEqual(emptyStats(7));
  });
  it("discards unknown schema versions and corrupted records", () => {
    expect(parseStats(JSON.stringify({ schemaVersion: 999, modes: {} }), 3)).toEqual(emptyStats(3));
    expect(parseStats("{not json", 3)).toEqual(emptyStats(3));
    expect(parseStats(JSON.stringify({ schemaVersion: 1, modes: { pot: { attempts: "x" } } }), 3).modes.pot.attempts).toBe(0);
    const partial = parseStats(JSON.stringify({ schemaVersion: 1, updatedAt: 2, modes: { pot: { attempts: 2, correct: 1, currentStreak: 1, bestStreak: 1, totalTimeMs: 5, recent: [null, { ts: 1, correct: true, timeMs: 1, seed: 1 }] } } }), 3);
    expect(partial.modes.pot.attempts).toBe(2);
    expect(partial.modes.pot.recent.length).toBe(1);
    expect(partial.modes.winner.attempts).toBe(0);
  });
  it("caps the recent history", () => {
    let s = emptyStats(1);
    for (let i = 0; i < 150; i++) s = recordAttempt(s, "hand-reading", { correct: true, timeMs: 1, seed: i, ts: i });
    expect(s.modes["hand-reading"].recent.length).toBe(100);
    expect(s.modes["hand-reading"].attempts).toBe(150);
  });
  it("survives a storage that throws", () => {
    const bad: StorageLike = { getItem: () => { throw new Error("nope"); }, setItem: () => { throw new Error("nope"); }, removeItem: () => { throw new Error("nope"); } };
    expect(loadStats(bad, 1)).toEqual(emptyStats(1));
    expect(() => saveStats(bad, emptyStats(1))).not.toThrow();
    expect(() => clearStats(bad)).not.toThrow();
  });
});
