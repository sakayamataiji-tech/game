import { describe, it, expect } from "vitest";
import {
  generateHandReading, generateWinner, generatePot, generateSidePot, generateScenario, MODES,
} from "@/engine/scenarioGenerator";
import { evaluateHand, HandCategory, HAND_CATEGORIES } from "@/engine/handEvaluator";
import { determineWinners } from "@/engine/handComparator";
import { calculatePot } from "@/engine/potCalculator";
import { replayHand } from "@/engine/betting";
import { cardId } from "@/engine/cards";
import { positionLabels } from "@/engine/positions";

const SEEDS = Array.from({ length: 300 }, (_, i) => 1000 + i * 7919);

function noDuplicates(cards: { rank: number; suit: string }[]) {
  const ids = cards.map((c) => cardId(c as never));
  expect(new Set(ids).size).toBe(ids.length);
}

describe("generateHandReading", () => {
  it("is deterministic for a seed and the answer is derived from the evaluator", () => {
    const a = generateHandReading(42);
    const b = generateHandReading(42);
    expect(a).toEqual(b);
    const hand = evaluateHand([...a.holeCards, ...a.board]);
    expect(a.answer.category).toBe(hand.category);
    expect(a.answer.hand.tiebreak).toEqual(hand.tiebreak);
  });
  it("deals 2 + 5 unique cards", () => {
    for (const seed of SEEDS.slice(0, 100)) {
      const s = generateHandReading(seed);
      expect(s.holeCards.length).toBe(2);
      expect(s.board.length).toBe(5);
      noDuplicates([...s.holeCards, ...s.board]);
    }
  });
  it("covers every hand category over many seeds", () => {
    const seen = new Set<HandCategory>();
    for (const seed of SEEDS) seen.add(generateHandReading(seed).answer.category);
    for (const c of HAND_CATEGORIES) expect(seen.has(c), `category ${c} never generated`).toBe(true);
  });
});

describe("generateWinner", () => {
  it("answer matches determineWinners and only complete splits are generated", () => {
    let splits = 0;
    for (const seed of SEEDS) {
      const s = generateWinner(seed);
      noDuplicates([...s.board, ...s.players.flatMap((p) => p.holeCards)]);
      const r = determineWinners(s.players.map((p) => ({ id: p.seat, holeCards: p.holeCards })), s.board);
      expect(s.answer.winners).toEqual(r.winners.slice().sort((a, b) => a - b));
      if (s.answer.split) {
        splits++;
        expect(s.answer.winners.length).toBe(s.players.length);
      } else {
        expect(s.answer.winners.length).toBe(1);
      }
      expect(s.players.length).toBeGreaterThanOrEqual(2);
      expect(s.players.length).toBeLessThanOrEqual(4);
    }
    expect(splits).toBeGreaterThan(0);
  });
});

describe("generatePot", () => {
  it("history replays legally, no all-ins, answer equals the engine's pot", () => {
    let handsOver = 0;
    for (const seed of SEEDS) {
      const s = generatePot(seed);
      const state = replayHand(s.history); // throws on any illegal action
      expect(state.players.some((p) => p.allIn)).toBe(false);
      const r = calculatePot(s.history);
      expect(s.answer.pot).toBe(r.pot);
      expect(r.pot + (r.breakdown.uncalled?.amount ?? 0)).toBe(r.totalContributed);
      expect(r.totalContributed).toBeGreaterThan(s.history.smallBlind + s.history.bigBlind);
      if (r.handOver) handsOver++;
      const lastStreet = s.history.streets[s.history.streets.length - 1].street;
      const expectedBoard = { preflop: 0, flop: 3, turn: 4, river: 5 }[lastStreet];
      expect(s.board.length).toBe(expectedBoard);
      for (const a of s.history.streets.flatMap((st) => st.actions)) {
        if (a.type === "raise" || a.type === "bet") expect(a.amount).toBeGreaterThan(0);
      }
    }
    expect(handsOver).toBeGreaterThan(0);
    expect(handsOver).toBeLessThan(SEEDS.length);
  });
  it("is deterministic per seed", () => {
    expect(generatePot(7)).toEqual(generatePot(7));
  });
});

describe("generateSidePot", () => {
  it("always has at least one side pot, replays legally, and pots sum to the contributions", () => {
    let withUncalled = 0;
    for (const seed of SEEDS) {
      const s = generateSidePot(seed);
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
      // main pot has the most eligible players; eligibility shrinks monotonically
      for (let i = 1; i < r.breakdown.pots.length; i++) {
        expect(r.breakdown.pots[i].eligible.length).toBeLessThanOrEqual(r.breakdown.pots[i - 1].eligible.length);
      }
    }
    expect(withUncalled).toBeGreaterThan(0);
  });
});

describe("generateScenario", () => {
  it("dispatches every mode", () => {
    for (const mode of MODES) expect(generateScenario(mode, 1).mode).toBe(mode);
  });
});

describe("positionLabels", () => {
  it("labels heads-up and full ring correctly", () => {
    expect(positionLabels([1, 2], 2)).toEqual({ 2: "BTN/SB", 1: "BB" });
    expect(positionLabels([1, 2, 3, 4, 5, 6], 3)).toEqual({ 3: "BTN", 4: "SB", 5: "BB", 6: "UTG", 1: "HJ", 2: "CO" });
    expect(positionLabels([1, 2, 3], 1)).toEqual({ 1: "BTN", 2: "SB", 3: "BB" });
  });
});
