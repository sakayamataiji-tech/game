import { describe, it, expect } from "vitest";
import { parseCards, cardsToString } from "@/engine/cards";
import { evaluateHand, HandCategory } from "@/engine/handEvaluator";
import { compareHands, determineWinners, rankHands } from "@/engine/handComparator";

const ev = (s: string) => evaluateHand(parseCards(s));
const five = (s: string) => cardsToString(ev(s).bestFive.slice().sort((a, b) => b.rank - a.rank));

describe("handEvaluator: categories", () => {
  it("high card", () => {
    const h = ev("As Kd 9c 7h 4s 3d 2c");
    expect(h.category).toBe(HandCategory.HighCard);
    expect(h.tiebreak).toEqual([14, 13, 9, 7, 4]);
    expect(five("As Kd 9c 7h 4s 3d 2c")).toBe("As Kd 9c 7h 4s");
  });
  it("one pair with three best kickers", () => {
    const h = ev("Ah Ad 9c 7h 4s 3d 2c");
    expect(h.category).toBe(HandCategory.OnePair);
    expect(h.tiebreak).toEqual([14, 9, 7, 4, 0]);
  });
  it("two pair: three pairs on 7 cards uses the top two pairs and best kicker", () => {
    const h = ev("Ah Ad 9c 9h 4s 4d Kc");
    expect(h.category).toBe(HandCategory.TwoPair);
    expect(h.tiebreak).toEqual([14, 9, 13, 0, 0]);
    expect(five("Ah Ad 9c 9h 4s 4d Kc")).toBe("Ah Ad Kc 9c 9h");
  });
  it("two pair: kicker can come from the third pair", () => {
    const h = ev("Ah Ad 9c 9h 4s 4d 3c");
    expect(h.tiebreak).toEqual([14, 9, 4, 0, 0]);
  });
  it("three of a kind", () => {
    const h = ev("7h 7d 7c Kh 4s 3d 2c");
    expect(h.category).toBe(HandCategory.ThreeOfAKind);
    expect(h.tiebreak).toEqual([7, 13, 4, 0, 0]);
  });
  it("straight", () => {
    const h = ev("9h 8d 7c 6h 5s Kd 2c");
    expect(h.category).toBe(HandCategory.Straight);
    expect(h.tiebreak[0]).toBe(9);
  });
  it("flush picks the best five of six suited cards", () => {
    const h = ev("Kh 9h 7h 5h 3h 2h Ad");
    expect(h.category).toBe(HandCategory.Flush);
    expect(h.tiebreak).toEqual([13, 9, 7, 5, 3]);
  });
  it("full house", () => {
    const h = ev("Kh Kd Kc 7h 7s 3d 2c");
    expect(h.category).toBe(HandCategory.FullHouse);
    expect(h.tiebreak).toEqual([13, 7, 0, 0, 0]);
    expect(h.description).toBe("Full House, Kings full of Sevens");
  });
  it("four of a kind with the best kicker", () => {
    const h = ev("9h 9d 9c 9s Ah 3d 2c");
    expect(h.category).toBe(HandCategory.FourOfAKind);
    expect(h.tiebreak).toEqual([9, 14, 0, 0, 0]);
  });
  it("straight flush", () => {
    const h = ev("9h 8h 7h 6h 5h Ad Ac");
    expect(h.category).toBe(HandCategory.StraightFlush);
    expect(h.tiebreak[0]).toBe(9);
    expect(h.isRoyalFlush).toBe(false);
  });
  it("royal flush", () => {
    const h = ev("Ah Kh Qh Jh Th 2d 3c");
    expect(h.category).toBe(HandCategory.StraightFlush);
    expect(h.isRoyalFlush).toBe(true);
    expect(h.description).toBe("Royal Flush");
  });
});

describe("handEvaluator: edge cases (§21)", () => {
  it("wheel: A-2-3-4-5 is a five-high straight", () => {
    const h = ev("Ah 2d 3c 4h 5s Kd Qc");
    expect(h.category).toBe(HandCategory.Straight);
    expect(h.tiebreak[0]).toBe(5);
    expect(h.bestFive.map((c) => c.rank).sort((a, b) => a - b)).toEqual([2, 3, 4, 5, 14]);
  });
  it("wheel loses to a six-high straight", () => {
    expect(compareHands(ev("Ah 2d 3c 4h 5s 9d 8c"), ev("6h 2d 3c 4h 5s 9d 8c"))).toBeLessThan(0);
  });
  it("no wrap-around: Q-K-A-2-3 is not a straight", () => {
    const h = ev("Qh Kd Ac 2h 3s 9d 7c");
    expect(h.category).toBe(HandCategory.HighCard);
  });
  it("steel wheel: A-2-3-4-5 suited is a straight flush", () => {
    const h = ev("Ah 2h 3h 4h 5h Kd Qc");
    expect(h.category).toBe(HandCategory.StraightFlush);
    expect(h.tiebreak[0]).toBe(5);
    expect(h.isRoyalFlush).toBe(false);
  });
  it("straight flush is found even when a higher flush (Ace) is present in the same suit", () => {
    const h = ev("Ah 9h 8h 7h 6h 5h 2c");
    expect(h.category).toBe(HandCategory.StraightFlush);
    expect(h.tiebreak[0]).toBe(9);
  });
  it("flush beats a straight made with off-suit cards", () => {
    const h = ev("9h 8h 7h 6d 5s 3h 2h");
    expect(h.category).toBe(HandCategory.Flush);
  });
  it("two trips on 7 cards: full house with the higher trips", () => {
    const h = ev("8h 8d 8c 7h 7s 7d Ac");
    expect(h.category).toBe(HandCategory.FullHouse);
    expect(h.tiebreak).toEqual([8, 7, 0, 0, 0]);
  });
  it("trips plus two pairs: full house uses the higher pair", () => {
    const h = ev("8h 8d 8c 7h 7s Ad Ac");
    expect(h.tiebreak).toEqual([8, 14, 0, 0, 0]);
  });
  it("quads on board: kicker decides", () => {
    const board = parseCards("9h 9d 9c 9s 3d");
    const r = determineWinners([
      { id: "A", holeCards: parseCards("Kh 2c") },
      { id: "B", holeCards: parseCards("Qh Jc") },
    ], board);
    expect(r.winners).toEqual(["A"]);
  });
  it("quads on board with kicker lower than board kicker: split", () => {
    const board = parseCards("9h 9d 9c 9s Kd");
    const r = determineWinners([
      { id: "A", holeCards: parseCards("Qh 2c") },
      { id: "B", holeCards: parseCards("Jh Tc") },
    ], board);
    expect(r.winners).toEqual(["A", "B"]);
  });
  it("board plays: every player ties", () => {
    const board = parseCards("Ah Kh Qh Jh Th");
    const r = determineWinners([
      { id: 1, holeCards: parseCards("2c 3c") },
      { id: 2, holeCards: parseCards("9d 9s") },
      { id: 3, holeCards: parseCards("Ad Kd") },
    ], board);
    expect(r.winners).toEqual([1, 2, 3]);
  });
  it("kicker plays: same pair, higher kicker wins", () => {
    const board = parseCards("Kh 7d 4c 9s 2h");
    const r = determineWinners([
      { id: "AK", holeCards: parseCards("Ad Kc") },
      { id: "KQ", holeCards: parseCards("Qd Ks") },
    ], board);
    expect(r.winners).toEqual(["AK"]);
  });
  it("kicker does not play when the board's kickers are higher: split", () => {
    const board = parseCards("Kh Qd Jc Ts 2h");
    const r = determineWinners([
      { id: "K5", holeCards: parseCards("5d Kc") },
      { id: "K3", holeCards: parseCards("3d Ks") },
    ], board);
    expect(r.winners).toEqual(["K5", "K3"]);
  });
  it("counterfeited two pair: board pairs above both", () => {
    const board = parseCards("Kh Kd Qc Qs 9h");
    const r = determineWinners([
      { id: "33", holeCards: parseCards("3d 3c") }, // K K Q Q 9 -> two pair KQ with 9
      { id: "A2", holeCards: parseCards("Ad 2c") }, // K K Q Q A
    ], board);
    expect(r.winners).toEqual(["A2"]);
  });
  it("suits never break ties", () => {
    expect(compareHands(ev("Ah Kh 9c 7d 4s 3d 2c"), ev("As Ks 9d 7c 4h 3c 2d"))).toBe(0);
  });
  it("flush vs flush compares all five cards", () => {
    expect(compareHands(ev("Ah Kh 9h 7h 4h 3d 2c"), ev("Ad Kd 9d 7d 3d 4c 2s"))).toBeGreaterThan(0);
  });
  it("straight on board vs higher straight", () => {
    const board = parseCards("5h 6d 7c 8s 9h");
    const r = determineWinners([
      { id: "T", holeCards: parseCards("Td 2c") },
      { id: "x", holeCards: parseCards("Ad Kc") },
    ], board);
    expect(r.winners).toEqual(["T"]);
  });
  it("trips vs trips: kicker decides; equal kickers split", () => {
    const board = parseCards("7h 7d 7c Ks 2h");
    expect(determineWinners([
      { id: "A", holeCards: parseCards("Ad 3c") },
      { id: "Q", holeCards: parseCards("Qd 3d") },
    ], board).winners).toEqual(["A"]);
    expect(determineWinners([
      { id: "A", holeCards: parseCards("Ad 3c") },
      { id: "B", holeCards: parseCards("Ac 4d") },
    ], board).winners).toEqual(["A", "B"]);
  });
  it("full house beats a flush; quads beat a full house", () => {
    expect(ev("Kh Kd Kc 7h 7s 3d 2c").category).toBeGreaterThan(ev("Kh 9h 7h 5h 3h 2h Ad").category);
    expect(ev("9h 9d 9c 9s Ah 3d 2c").category).toBeGreaterThan(ev("Kh Kd Kc 7h 7s 3d 2c").category);
  });
  it("evaluates exactly 5 and 6 cards too", () => {
    expect(ev("Ah Kh Qh Jh Th").isRoyalFlush).toBe(true);
    expect(ev("Ah Ad 9c 9h 4s 4d").tiebreak).toEqual([14, 9, 4, 0, 0]);
  });
  it("rejects duplicate cards and wrong card counts", () => {
    expect(() => ev("Ah Ah 9c 9h 4s")).toThrow();
    expect(() => ev("Ah 9c 9h 4s")).toThrow();
    expect(() => ev("Ah 9c 9h 4s 2d 3d 5d 6d")).toThrow();
  });
});

describe("handComparator", () => {
  it("returns multiple winners on a partial tie (engine supports any number of winners)", () => {
    const board = parseCards("Ah Kd 9c 5s 2h");
    const r = determineWinners([
      { id: 1, holeCards: parseCards("Qd Jc") },
      { id: 2, holeCards: parseCards("Qs Jd") },
      { id: 3, holeCards: parseCards("3d 7c") },
    ], board);
    expect(r.winners).toEqual([1, 2]);
  });
  it("rankHands shares ranks between tied hands", () => {
    const board = parseCards("Ah Kd 9c 5s 2h");
    const { hands } = determineWinners([
      { id: 1, holeCards: parseCards("Qd Jc") },
      { id: 2, holeCards: parseCards("Qs Jd") },
      { id: 3, holeCards: parseCards("3d 7c") },
      { id: 4, holeCards: parseCards("Ad 4c") },
    ], board);
    const ranked = rankHands(hands);
    expect(ranked.map((r) => [r.id, r.rank])).toEqual([[4, 1], [1, 2], [2, 2], [3, 4]]);
  });
});
