import { describe, it, expect } from "vitest";
import { gradeOf, rateMode, rateOverall, scoreAnswer, speedFeedback, RATING_MIN_ATTEMPTS } from "@/engine/rating";
import { classifyHandReading, classifyWinner, SKILLS, SKILL_IDS } from "@/engine/skills";
import { parseCards } from "@/engine/cards";
import { evaluateHand } from "@/engine/handEvaluator";
import { determineWinners } from "@/engine/handComparator";

describe("speed feedback and score", () => {
  it("classifies FAST / NORMAL / SLOW per mode", () => {
    expect(speedFeedback("hand-reading", 2000)).toBe("FAST");
    expect(speedFeedback("hand-reading", 6000)).toBe("NORMAL");
    expect(speedFeedback("hand-reading", 9000)).toBe("SLOW");
    expect(speedFeedback("side-pot", 20000)).toBe("FAST");
  });
  it("scores 0 for a wrong answer and base + speed + streak for a right one", () => {
    expect(scoreAnswer(false, "pot", 1000, 0).total).toBe(0);
    expect(scoreAnswer(true, "hand-reading", 2000, 1)).toEqual({ base: 100, speedBonus: 30, streakBonus: 0, total: 130 });
    expect(scoreAnswer(true, "hand-reading", 6000, 4)).toEqual({ base: 100, speedBonus: 10, streakBonus: 15, total: 125 });
    expect(scoreAnswer(true, "hand-reading", 20000, 50).streakBonus).toBe(50); // capped
  });
});

describe("dealer rating", () => {
  it("needs a minimum number of attempts", () => {
    const r = rateMode("pot", { attempts: RATING_MIN_ATTEMPTS - 1, correct: 5, totalTimeMs: 5000, levelSum: 5 });
    expect(r.grade).toBe("-");
    expect(r.accuracy).toBeCloseTo(5 / (RATING_MIN_ATTEMPTS - 1));
  });
  it("accuracy dominates; speed and difficulty add up to 30 points", () => {
    const perfect = rateMode("hand-reading", { attempts: 20, correct: 20, totalTimeMs: 20 * 2000, levelSum: 100 });
    expect(perfect.points).toBe(100);
    expect(perfect.grade).toBe("S");
    const slowEasy = rateMode("hand-reading", { attempts: 20, correct: 20, totalTimeMs: 20 * 30000, levelSum: 20 });
    expect(slowEasy.points).toBe(70);
    expect(slowEasy.grade).toBe("B");
    const half = rateMode("hand-reading", { attempts: 20, correct: 10, totalTimeMs: 20 * 2000, levelSum: 100 });
    expect(half.points).toBe(65);
  });
  it("grade boundaries", () => {
    expect(gradeOf(90)).toBe("S"); expect(gradeOf(89)).toBe("A"); expect(gradeOf(80)).toBe("A");
    expect(gradeOf(65)).toBe("B"); expect(gradeOf(50)).toBe("C"); expect(gradeOf(49)).toBe("D");
  });
  it("overall is not a plain average: untrained modes lower it", () => {
    const strong = { attempts: 30, correct: 30, totalTimeMs: 30 * 2000, levelSum: 150 };
    const none = { attempts: 0, correct: 0, totalTimeMs: 0, levelSum: 0 };
    const onlyOne = rateOverall({ "hand-reading": strong, winner: none, pot: none, "side-pot": none });
    const all = rateOverall({ "hand-reading": strong, winner: strong, pot: { ...strong, totalTimeMs: 30 * 5000 }, "side-pot": { ...strong, totalTimeMs: 30 * 10000 } });
    expect(onlyOne.points).toBeLessThan(all.points!);
    expect(all.grade).toBe("S");
    expect(onlyOne.grade).not.toBe("S");
  });
});

describe("skill classification", () => {
  it("every skill has a label and a mode", () => {
    for (const id of SKILL_IDS) {
      expect(SKILLS[id].label.length).toBeGreaterThan(0);
      expect(["hand-reading", "winner", "pot", "side-pot"]).toContain(SKILLS[id].mode);
    }
  });
  it("tags wheel, board play and counterfeit in hand reading", () => {
    const hole = parseCards("Ah 2d"); const board = parseCards("3c 4h 5s Kd 9c");
    expect(classifyHandReading(hole, board, evaluateHand([...hole, ...board]))).toEqual(expect.arrayContaining(["straight-detection", "wheel-straight"]));
    const h2 = parseCards("2c 3c"); const b2 = parseCards("Ah Kh Qh Jh Th");
    expect(classifyHandReading(h2, b2, evaluateHand([...h2, ...b2]))).toContain("board-play");
    const h3 = parseCards("3d 3c"); const b3 = parseCards("Kh Kd 9c 9s 4h");
    expect(classifyHandReading(h3, b3, evaluateHand([...h3, ...b3]))).toContain("counterfeit");
  });
  it("tags comparisons and splits in winner scenarios", () => {
    const board = parseCards("Kh 7d 4c 9s 2h");
    const r = determineWinners([{ id: 1, holeCards: parseCards("Ad Kc") }, { id: 2, holeCards: parseCards("Qd Ks") }], board);
    const skills = classifyWinner(r.hands.map((h) => ({ seat: h.id, hand: h.hand })), r.winners, board);
    expect(skills).toEqual(expect.arrayContaining(["pair-comparison", "kicker-comparison"]));
    const b2 = parseCards("Ah Kh Qh Jh Th");
    const r2 = determineWinners([{ id: 1, holeCards: parseCards("2c 3c") }, { id: 2, holeCards: parseCards("9d 9s") }], b2);
    expect(classifyWinner(r2.hands.map((h) => ({ seat: h.id, hand: h.hand })), r2.winners, b2)).toEqual(expect.arrayContaining(["split-pot", "board-play-split"]));
  });
});
