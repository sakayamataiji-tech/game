import { describe, it, expect } from "vitest";
import { comboLabel, dailyMissions, dayStreak, rankProgress, RANKS } from "@/lib/game";
import { emptyStats, recordAttempt, dayKey, AttemptInput } from "@/lib/stats";

const attempt = (ts: number, correct = true): AttemptInput => ({ mode: "pot", level: 1, skills: [], correct, timeMs: 1000, seed: 1, score: correct ? 100 : 0, ts });
const DAY = 24 * 3600 * 1000;

describe("rank progress", () => {
  it("maps XP to ranks with progress toward the next one", () => {
    expect(rankProgress(0).rank.title).toBe("ROOKIE");
    expect(rankProgress(999).next!.title).toBe("TRAINEE");
    const r = rankProgress(2000);
    expect(r.rank.title).toBe("TRAINEE");
    expect(r.progress).toBeCloseTo(0.5);
    expect(r.remaining).toBe(1000);
    const top = rankProgress(999999);
    expect(top.rank).toBe(RANKS[RANKS.length - 1]);
    expect(top.next).toBeNull();
    expect(top.progress).toBe(1);
  });
});

describe("day streak", () => {
  it("counts consecutive days back from today, or from yesterday when today is untouched", () => {
    const now = new Date(2026, 8, 20, 12).getTime();
    let s = emptyStats(1);
    expect(dayStreak(s, now)).toBe(0);
    s = recordAttempt(s, attempt(now - 2 * DAY));
    s = recordAttempt(s, attempt(now - DAY));
    expect(dayStreak(s, now)).toBe(2); // yesterday + the day before, today not yet played
    s = recordAttempt(s, attempt(now));
    expect(dayStreak(s, now)).toBe(3);
    s = recordAttempt(s, attempt(now - 5 * DAY));
    expect(dayStreak(s, now)).toBe(3); // gap at -3/-4 breaks it
    expect(dayKey(now)).toBe("2026-09-20");
  });
});

describe("daily missions and combos", () => {
  it("tracks today's questions and correct answers", () => {
    const now = Date.now();
    let s = emptyStats(1);
    for (let i = 0; i < 12; i++) s = recordAttempt(s, attempt(now, i % 2 === 0));
    const m = dailyMissions(s, now);
    expect(m[0]).toMatchObject({ done: 10, complete: true });
    expect(m[1]).toMatchObject({ done: 6, complete: false });
  });
  it("combo labels", () => {
    expect(comboLabel(2)).toBeNull();
    expect(comboLabel(3)).toBe("COMBO");
    expect(comboLabel(5)).toBe("ON FIRE");
    expect(comboLabel(12)).toBe("UNSTOPPABLE");
  });
});
