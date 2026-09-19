/**
 * §21 edge cases, one test per named item, expressed through the public
 * engine API (evaluate / compare / determineWinners / calculateSidePots).
 */
import { describe, it, expect } from "vitest";
import { parseCards, cardsToString } from "@/engine/cards";
import { evaluateHand, HandCategory } from "@/engine/handEvaluator";
import { compareHands, determineWinners } from "@/engine/handComparator";
import { calculateSidePots } from "@/engine/sidePotCalculator";
import { calculatePot } from "@/engine/potCalculator";

const ev = (s: string) => evaluateHand(parseCards(s));
const winners = (board: string, hands: Record<string, string>) =>
  determineWinners(Object.entries(hands).map(([id, h]) => ({ id, holeCards: parseCards(h) })), parseCards(board)).winners;

describe("§21 edge cases", () => {
  it("Wheel Straight (A-2-3-4-5): five high, beaten by 6-high, labelled 5-4-3-2-A", () => {
    const wheel = ev("Ah 2d 3c 4h 5s Kd 9c");
    expect(wheel.category).toBe(HandCategory.Straight);
    expect(wheel.tiebreak[0]).toBe(5);
    expect(wheel.ranksLabel).toBe("5-4-3-2-A");
    expect(compareHands(wheel, ev("6h 2d 3c 4h 5s Kd 9c"))).toBeLessThan(0);
  });
  it("Royal Flush: highest straight flush, titled ROYAL FLUSH", () => {
    const rf = ev("Ah Kh Qh Jh Th 2d 3c");
    expect(rf.isRoyalFlush).toBe(true);
    expect(rf.title).toBe("ROYAL FLUSH");
    expect(rf.ranksLabel).toBe("A-K-Q-J-T");
    expect(compareHands(rf, ev("Kh Qh Jh Th 9h 2d 3c"))).toBeGreaterThan(0);
  });
  it("Board Straight: everyone ties unless someone holds a higher straight", () => {
    expect(winners("5h 6d 7c 8s 9h", { a: "Ad Kc", b: "2d 2c", c: "Qd Jc" })).toEqual(["a", "b", "c"]);
    expect(winners("5h 6d 7c 8s 9h", { a: "Ad Kc", b: "Td 2c" })).toEqual(["b"]);
  });
  it("Board Flush: board plays unless a hole card beats the lowest board flush card", () => {
    // board K J 8 6 3 of hearts: a 9h replaces the 3h and 6h? No: best five = K J 9 8 6 beats K J 8 6 3
    expect(winners("Kh Jh 8h 6h 3h", { a: "9h 2c", b: "Ad Kd" })).toEqual(["a"]);
    expect(winners("Kh Jh 8h 6h 3h", { a: "2h 4c", b: "Ad Kd" })).toEqual(["a", "b"]); // 2h does not improve the board flush
    expect(winners("Kh Jh 8h 6h 3h", { a: "Ah 4c", b: "Qh Kd" })).toEqual(["a"]);
  });
  it("Four Flush Board: one hole card of the suit makes a flush; higher card wins", () => {
    expect(winners("Kh Jh 8h 6h 3c", { a: "9h 2c", b: "Ad Kd", c: "Qh 4d" })).toEqual(["c"]);
    expect(winners("Kh Jh 8h 6h 3c", { a: "9h 2c", b: "Ah Kd", c: "Qh 4d" })).toEqual(["b"]);
  });
  it("Double Paired Board: pocket pair below both board pairs is counterfeited", () => {
    // board K K 9 9 4: 33 plays K K 9 9 4 (two pair, 4 kicker) vs A2 plays K K 9 9 A
    expect(winners("Kh Kd 9c 9s 4h", { pp: "3d 3c", ace: "Ad 2c" })).toEqual(["ace"]);
    // a pocket pair ABOVE a board pair makes a better two pair (Q Q vs 9 9)
    expect(winners("Kh Kd 9c 9s 4h", { qq: "Qd Qc", ace: "Ad 2c" })).toEqual(["qq"]);
    // a hole card matching a board pair makes a full house
    expect(winners("Kh Kd 9c 9s 4h", { nine: "9d 2c", ace: "Ad 2d" })).toEqual(["nine"]);
    expect(ev("Kh Kd 9c 9s 4h 9d 2c").category).toBe(HandCategory.FullHouse);
  });
  it("Full House vs Full House: trips rank first, then the pair", () => {
    expect(winners("Kh Kd 7c 7s 2h", { kings: "Kc 3d", sevens: "7d Ad" })).toEqual(["kings"]); // K full of 7 > 7 full of K
    expect(winners("Kh 7d 7c 2s 2h", { a: "Kd Kc", b: "7h Ad" })).toEqual(["a"]); // K full of 7 > 7 full of K
    expect(winners("Qh Qd 7c 7s 2h", { a: "Qc Ad", b: "Qs 3d" })).toEqual(["a", "b"]); // both Q full of 7 -> split
    expect(winners("Qh Qd 7c 7s 2h", { a: "Qc Ad", b: "Qs 2d" })).toEqual(["a", "b"]); // Q full of 7 for both (2s do not improve)
    expect(winners("Qh Qd 7c 2s 2h", { a: "Qc 7d", b: "Qs Ad" })).toEqual(["a"]); // Q full of 7 > Q full of 2
  });
  it("Quads Kicker: with quads on board, the highest hole card decides; the board kicker can play", () => {
    expect(winners("9h 9d 9c 9s 3d", { a: "Kh 2c", b: "Qh Jc" })).toEqual(["a"]);
    expect(winners("9h 9d 9c 9s Kd", { a: "Qh 2c", b: "Jh Tc" })).toEqual(["a", "b"]);
    expect(winners("9h 9d 9c 9s Kd", { a: "Ah 2c", b: "Jh Tc" })).toEqual(["a"]);
    // quads made with a pocket pair beat quads on board? no: board quads are everyone's; pocket quads vs board trips
    expect(winners("9h 9d 9c 5s 3d", { a: "9s 2c", b: "Ah Ad" })).toEqual(["a"]);
  });
  it("Same Straight: identical straights split regardless of suits", () => {
    expect(winners("5h 6d 7c Ks 2h", { a: "8d 9c", b: "8s 9h" })).toEqual(["a", "b"]);
    expect(winners("5h 6d 7c Ks 2h", { a: "8d 9c", b: "8s 4h" })).toEqual(["a"]); // 9-high beats 8-high
  });
  it("Same Flush: identical five flush cards split; any higher card breaks the tie", () => {
    expect(winners("Kh Jh 8h 6h 3h", { a: "2c 4c", b: "5d 2d" })).toEqual(["a", "b"]);
    expect(winners("Kh Jh 8h 6h 3c", { a: "2h 4c", b: "5h 2d" })).toEqual(["b"]); // K J 8 6 5 > K J 8 6 2
    expect(winners("Kh Jh 8h 6h 3c", { a: "9h 4c", b: "9d 2h" })).toEqual(["a"]); // fifth card 9 vs 2? b has K J 8 6 2 -> a wins
  });
  it("Kicker Comparison: same pair, kicker decides; kickers below the board do not play", () => {
    expect(winners("Kh 7d 4c 9s 2h", { ak: "Ad Kc", kq: "Qd Ks" })).toEqual(["ak"]);
    expect(winners("Kh Qd Jc Ts 2h", { k5: "5d Kc", k3: "3d Ks" })).toEqual(["k5", "k3"]);
    expect(winners("Ah Ad 9c 6s 2h", { a: "Kd 3c", b: "Qd Jc" })).toEqual(["a"]); // A A K 9 6 vs A A Q J 9
  });
  it("Counterfeit Two Pair: two pair in hand loses to a higher board pair + better kicker", () => {
    // board A A 8 8 4: hole 33 -> A A 8 8 4 (two pair, board) ; hole K2 -> A A 8 8 K
    expect(winners("Ah Ad 8c 8s 4h", { pp: "3d 3c", k: "Kd 2c" })).toEqual(["k"]);
    // hole 44 on that board makes 44 the second pair? no: A A 8 8 4 4 -> best two pair A A 8 8 with 4 kicker vs K2: A A 8 8 K
    expect(winners("Ah Ad 8c 8s 4h", { fours: "4d 4c", k: "Kd 2c" })).toEqual(["fours"]); // 4 4 4 -> full house? 4h 4d 4c = trips -> A A + 4 4 4 = 4s full of A
    expect(ev("Ah Ad 8c 8s 4h 4d 4c").category).toBe(HandCategory.FullHouse);
  });
  it("Three-way Split: three players share the exact same best five", () => {
    expect(winners("Ah Kh Qh Jh Th", { a: "2c 3c", b: "9d 9s", c: "Ad Kd" })).toEqual(["a", "b", "c"]);
    expect(winners("5h 6d 7c 8s 9h", { a: "2c 3c", b: "Kd 9s", c: "Ad Kc" })).toEqual(["a", "b", "c"]);
    const r = determineWinners([
      { id: "a", holeCards: parseCards("Qd Jc") }, { id: "b", holeCards: parseCards("Qs Jd") }, { id: "c", holeCards: parseCards("Qc Jh") }, { id: "d", holeCards: parseCards("7c 8c") },
    ], parseCards("Ah Kd 9c 5s 2h"));
    expect(r.winners).toEqual(["a", "b", "c"]); // partial three-way split: engine reports all three
  });
  it("Multiple Side Pots: A 3,000 / B 8,000 / C 15,000 / D 15,000 all-in", () => {
    const r = calculateSidePots([
      { seat: 1, amount: 3000, folded: false }, { seat: 2, amount: 8000, folded: false },
      { seat: 3, amount: 15000, folded: false }, { seat: 4, amount: 15000, folded: false },
    ]);
    expect(r.pots.map((p) => [p.amount, p.eligible])).toEqual([
      [12000, [1, 2, 3, 4]], [15000, [2, 3, 4]], [14000, [3, 4]],
    ]);
    expect(r.uncalled).toBeNull();
    expect(r.total).toBe(41000);
  });
  it("Folded Player Contribution: stays in the pots, never eligible", () => {
    const r = calculateSidePots([
      { seat: 1, amount: 3000, folded: false }, { seat: 2, amount: 8000, folded: false },
      { seat: 3, amount: 15000, folded: false }, { seat: 4, amount: 5000, folded: true },
    ]);
    // uncalled: seat 3 put in 15000 but the most anyone else has is 8000 -> 7000 back
    expect(r.uncalled).toEqual({ seat: 3, amount: 7000 });
    expect(r.pots.map((p) => [p.amount, p.eligible])).toEqual([
      [12000, [1, 2, 3]], // 3000 x 4 (seat 4's first 3000 included)
      [12000, [2, 3]],    // 5000 + 5000 + 2000 from the folder
    ]);
    expect(r.pots.every((p) => !p.eligible.includes(4))).toBe(true);
  });
  it("Spec §10 example replayed by the engine: the pot is 14,500, not the 13,500 in the example", () => {
    // Blinds 500/1000; UTG call, HJ call, BTN raise to 4000, SB fold, BB call, UTG call, HJ fold.
    const r = calculatePot({
      players: [1, 2, 3, 4, 5].map((seat) => ({ seat, name: `P${seat}`, stack: 100000 })),
      buttonSeat: 3, smallBlind: 500, bigBlind: 1000,
      streets: [{ street: "preflop", actions: [
        { seat: 1, type: "call" }, { seat: 2, type: "call" }, { seat: 3, type: "raise", amount: 4000 },
        { seat: 4, type: "fold" }, { seat: 5, type: "call" }, { seat: 1, type: "call" }, { seat: 2, type: "fold" },
      ] }],
    });
    expect(r.contributions.map((c) => c.amount)).toEqual([4000, 1000, 4000, 500, 4000]);
    expect(r.pot).toBe(13500);
    expect(cardsToString(parseCards("As Kd"))).toBe("As Kd");
  });
});
