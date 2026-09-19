import { describe, it, expect } from "vitest";
import {
  generateHandReading, generateWinner, generatePot, generateSidePot, generateScenario, MODES, pickQuickMode,
} from "@/engine/scenarioGenerator";
import { evaluateHand, HandCategory, HAND_CATEGORIES } from "@/engine/handEvaluator";
import { determineWinners } from "@/engine/handComparator";
import { calculatePot } from "@/engine/potCalculator";
import { replayHand } from "@/engine/betting";
import { cardId } from "@/engine/cards";
import { positionLabels } from "@/engine/positions";
import { LEVELS } from "@/engine/rating";
import { isBoardPlay } from "@/engine/skills";

const SEEDS = Array.from({ length: 120 }, (_, i) => 1000 + i * 7919);

function noDuplicates(cards: { rank: number; suit: string }[]) {
  const ids = cards.map((c) => cardId(c as never));
  expect(new Set(ids).size).toBe(ids.length);
}

describe("generateHandReading", () => {
  it("is deterministic for a seed and the answer is derived from the evaluator", () => {
    const a = generateHandReading({ seed: 42, level: 3 });
    const b = generateHandReading({ seed: 42, level: 3 });
    expect(a).toEqual(b);
    const hand = evaluateHand([...a.holeCards, ...a.board]);
    expect(a.answer.category).toBe(hand.category);
    expect(a.answer.hand.tiebreak).toEqual(hand.tiebreak);
    expect(a.level).toBe(3);
    expect(a.skills.length).toBeGreaterThan(0);
  });
  it("deals 2 + 5 unique cards at every level", () => {
    for (const level of LEVELS) for (const seed of SEEDS.slice(0, 40)) {
      const s = generateHandReading({ seed, level });
      expect(s.holeCards.length).toBe(2);
      expect(s.board.length).toBe(5);
      noDuplicates([...s.holeCards, ...s.board]);
    }
  });
  it("covers every hand category over many seeds (all levels mixed)", () => {
    const seen = new Set<HandCategory>();
    for (const seed of SEEDS) for (const level of LEVELS) seen.add(generateHandReading({ seed, level }).answer.category);
    for (const c of HAND_CATEGORIES) expect(seen.has(c), `category ${c} never generated`).toBe(true);
  });
  it("level 1 makes clear hands, level 2 two pair / trips / full house, level 4 board plays", () => {
    for (const seed of SEEDS.slice(0, 60)) {
      const l1 = generateHandReading({ seed, level: 1 });
      expect([HandCategory.HighCard, HandCategory.OnePair, HandCategory.Straight, HandCategory.Flush, HandCategory.FourOfAKind]).toContain(l1.answer.category);
      const l2 = generateHandReading({ seed, level: 2 });
      expect([HandCategory.TwoPair, HandCategory.ThreeOfAKind, HandCategory.FullHouse]).toContain(l2.answer.category);
      const l4 = generateHandReading({ seed, level: 4 });
      expect(isBoardPlay(l4.answer.hand, l4.board)).toBe(true);
      expect(l4.skills).toContain("board-play");
    }
  });
  it("weak skills of another mode do not change the scenario for a seed", () => {
    expect(generateWinner({ seed: 4242, level: 1, weakSkills: ["pair-detection", "side-pot"] })).toEqual(generateWinner({ seed: 4242, level: 1 }));
    expect(generateHandReading({ seed: 4242, level: 1, weakSkills: ["split-pot"] })).toEqual(generateHandReading({ seed: 4242, level: 1 }));
  });
  it("biases toward weak skills when asked", () => {
    let hits = 0;
    for (const seed of SEEDS) {
      const s = generateHandReading({ seed, level: 1, weakSkills: ["flush-detection"] });
      if (s.skills.includes("flush-detection")) hits++;
    }
    expect(hits).toBeGreaterThan(SEEDS.length * 0.4);
  });
});

describe("generateWinner", () => {
  it("player count follows the level (2..6) and answers match determineWinners", () => {
    for (const level of LEVELS) {
      let splits = 0;
      for (const seed of SEEDS.slice(0, 50)) {
        const s = generateWinner({ seed, level });
        expect(s.players.length).toBe(level + 1);
        noDuplicates([...s.board, ...s.players.flatMap((p) => p.holeCards)]);
        const r = determineWinners(s.players.map((p) => ({ id: p.seat, holeCards: p.holeCards })), s.board);
        expect(s.answer.winners).toEqual(r.winners.slice().sort((a, b) => a - b));
        if (s.answer.split) {
          splits++;
          expect(s.answer.winners.length).toBe(s.players.length); // MVP: complete splits only
          expect(s.skills).toContain("split-pot");
        } else {
          expect(s.answer.winners.length).toBe(1);
        }
      }
      expect(splits, `level ${level} never produced a split`).toBeGreaterThan(0);
    }
  });
  it("level 5 produces tricky comparisons", () => {
    let tricky = 0;
    for (const seed of SEEDS.slice(0, 60)) {
      const s = generateWinner({ seed, level: 5 });
      if (s.skills.some((k) => ["counterfeit", "full-house-comparison", "flush-comparison", "straight-comparison", "quads-kicker", "board-play-split", "two-pair-comparison", "kicker-comparison", "split-pot"].includes(k))) tricky++;
    }
    expect(tricky).toBeGreaterThan(45);
  });
});

describe("generatePot", () => {
  it("history replays legally, no all-ins, answer equals the engine's pot; streets follow the level", () => {
    for (const level of LEVELS) {
      for (const seed of SEEDS.slice(0, 40)) {
        const s = generatePot({ seed, level });
        const state = replayHand(s.history); // throws on any illegal action
        expect(state.players.some((p) => p.allIn)).toBe(false);
        const r = calculatePot(s.history);
        expect(s.answer.pot).toBe(r.pot);
        expect(r.pot + (r.breakdown.uncalled?.amount ?? 0)).toBe(r.totalContributed);
        expect(r.totalContributed).toBeGreaterThan(s.history.smallBlind + s.history.bigBlind);
        const lastStreet = s.history.streets[s.history.streets.length - 1].street;
        const expectedBoard = { preflop: 0, flop: 3, turn: 4, river: 5 }[lastStreet];
        expect(s.board.length).toBe(expectedBoard);
        if (level === 1) expect(s.history.streets.length).toBe(1);
        expect(s.history.players.length).toBeLessThanOrEqual(9);
        expect(s.history.players.length).toBeGreaterThanOrEqual(2);
        expect(s.skills.length).toBeGreaterThan(0);
      }
    }
  });
  it("level 5 uses 6-9 players and mostly reaches the river", () => {
    let river = 0;
    for (const seed of SEEDS.slice(0, 40)) {
      const s = generatePot({ seed, level: 5 });
      expect(s.history.players.length).toBeGreaterThanOrEqual(6);
      if (s.history.streets.length === 4) river++;
    }
    expect(river).toBeGreaterThan(10);
  });
  it("is deterministic per seed", () => {
    expect(generatePot({ seed: 7, level: 2 })).toEqual(generatePot({ seed: 7, level: 2 }));
  });
});

describe("generateSidePot", () => {
  it("always has at least one side pot, replays legally, and pots sum to the contributions", () => {
    let withUncalled = 0;
    for (const level of LEVELS) {
      for (const seed of SEEDS.slice(0, 40)) {
        const s = generateSidePot({ seed, level });
        const r = calculatePot(s.history);
        expect(r.breakdown.pots.length).toBeGreaterThanOrEqual(2);
        expect(s.answer.pots).toEqual(r.breakdown.pots);
        expect(r.pot + (r.breakdown.uncalled?.amount ?? 0)).toBe(r.totalContributed);
        if (r.breakdown.uncalled) withUncalled++;
        for (const pot of r.breakdown.pots) {
          expect(pot.amount).toBeGreaterThan(0);
          expect(pot.eligible.length).toBeGreaterThanOrEqual(1);
          for (const seat of pot.eligible) expect(r.state.players.find((p) => p.seat === seat)!.folded).toBe(false);
        }
        for (let i = 1; i < r.breakdown.pots.length; i++) {
          expect(r.breakdown.pots[i].eligible.length).toBeLessThanOrEqual(r.breakdown.pots[i - 1].eligible.length);
        }
        if (level === 1) {
          expect(s.history.players.length).toBe(3);
          expect(r.breakdown.pots.length).toBe(2);
          expect(r.state.players.some((p) => p.folded)).toBe(false);
        }
        if (level === 3) expect(r.breakdown.pots.length).toBe(3);
        expect(s.skills).toContain("side-pot");
      }
    }
    expect(withUncalled).toBeGreaterThan(0);
  });
});

describe("generateScenario / pickQuickMode", () => {
  it("dispatches every mode", () => {
    for (const mode of MODES) expect(generateScenario(mode, { seed: 1, level: 1 }).mode).toBe(mode);
  });
  it("quick mode is deterministic per seed and honours weights", () => {
    expect(pickQuickMode(5)).toBe(pickQuickMode(5));
    const counts: Record<string, number> = {};
    for (let i = 0; i < 400; i++) { const m = pickQuickMode(i, { "side-pot": 10, pot: 0.05, winner: 0.05, "hand-reading": 0.05 }); counts[m] = (counts[m] ?? 0) + 1; }
    expect(counts["side-pot"]).toBeGreaterThan(300);
  });
});

describe("positionLabels", () => {
  it("labels heads-up and full ring correctly", () => {
    expect(positionLabels([1, 2], 2)).toEqual({ 2: "BTN/SB", 1: "BB" });
    expect(positionLabels([1, 2, 3, 4, 5, 6], 3)).toEqual({ 3: "BTN", 4: "SB", 5: "BB", 6: "UTG", 1: "HJ", 2: "CO" });
    expect(positionLabels([1, 2, 3], 1)).toEqual({ 1: "BTN", 2: "SB", 3: "BB" });
    const nine = positionLabels([1, 2, 3, 4, 5, 6, 7, 8, 9], 1);
    expect(Object.values(nine)).toEqual(["BTN", "SB", "BB", "UTG", "UTG+1", "MP", "LJ", "HJ", "CO"]);
  });
});
