import { describe, it, expect } from "vitest";
import { summarizeSession, nextAutoLevel, isSessionOver, SessionAttempt } from "@/lib/session";

const a = (over: Partial<SessionAttempt>): SessionAttempt => ({ mode: "pot", level: 1, skills: [], correct: true, timeMs: 1000, score: 100, ...over });

describe("session summary", () => {
  it("computes accuracy, average, best streak, score and weakest skill", () => {
    const s = summarizeSession([
      a({ correct: true, timeMs: 1000, skills: ["preflop-pot"] }),
      a({ correct: true, timeMs: 3000, skills: ["preflop-pot"] }),
      a({ correct: false, timeMs: 2000, skills: ["uncalled-bet"], score: 0 }),
      a({ correct: false, timeMs: 2000, skills: ["uncalled-bet"], score: 0 }),
      a({ correct: true, timeMs: 2000, skills: ["uncalled-bet"] }),
    ]);
    expect(s.total).toBe(5);
    expect(s.correct).toBe(3);
    expect(s.accuracy).toBeCloseTo(0.6);
    expect(s.avgTimeMs).toBe(2000);
    expect(s.bestStreak).toBe(2);
    expect(s.score).toBe(300);
    expect(s.weakest).toMatchObject({ kind: "skill", id: "uncalled-bet" });
  });
  it("falls back to the weakest mode when no skill has 2+ attempts", () => {
    const s = summarizeSession([a({ mode: "pot", correct: true }), a({ mode: "winner", correct: false, skills: ["split-pot"], score: 0 })]);
    expect(s.weakest).toMatchObject({ kind: "mode", mode: "winner" });
  });
  it("empty session", () => {
    const s = summarizeSession([]);
    expect(s.accuracy).toBeNull();
    expect(s.weakest).toBeNull();
  });
});

describe("auto level", () => {
  it("moves up after three correct, down after two misses, capped at 1..5", () => {
    expect(nextAutoLevel(2, [true, true, true])).toBe(3);
    expect(nextAutoLevel(5, [true, true, true])).toBe(5);
    expect(nextAutoLevel(3, [true, false, false])).toBe(2);
    expect(nextAutoLevel(1, [false, false])).toBe(1);
    expect(nextAutoLevel(3, [true, true])).toBe(3);
  });
  it("session ends at the configured length", () => {
    expect(isSessionOver({ train: "pot", length: 10, level: 1 }, 9)).toBe(false);
    expect(isSessionOver({ train: "pot", length: 10, level: 1 }, 10)).toBe(true);
    expect(isSessionOver({ train: "pot", length: "endless", level: 1 }, 999)).toBe(false);
  });
});
