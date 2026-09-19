import { describe, it, expect } from "vitest";
import {
  startHand, startStreet, applyAction, legalActions, isRoundComplete, replayHand, HandHistory, BettingError, totalPot,
} from "@/engine/betting";
import { calculatePot } from "@/engine/potCalculator";

const players = (stacks: number[]) => stacks.map((stack, i) => ({ seat: i + 1, name: `P${i + 1}`, stack }));

describe("betting engine: blinds and order", () => {
  it("posts blinds and starts with UTG (seat after BB)", () => {
    const s = startHand({ players: players([1000, 1000, 1000, 1000]), buttonSeat: 1, smallBlind: 5, bigBlind: 10 });
    expect(s.players[1].streetContribution).toBe(5);
    expect(s.players[2].streetContribution).toBe(10);
    expect(s.toAct).toEqual([4, 1, 2, 3]);
    expect(s.currentBet).toBe(10);
    expect(totalPot(s)).toBe(15);
  });
  it("heads-up: button posts SB and acts first preflop, BB acts first postflop", () => {
    const s = startHand({ players: players([1000, 1000]), buttonSeat: 2, smallBlind: 5, bigBlind: 10 });
    expect(s.players[1].streetContribution).toBe(5); // seat 2 = button = SB
    expect(s.players[0].streetContribution).toBe(10);
    expect(s.toAct).toEqual([2, 1]);
    applyAction(s, { seat: 2, type: "call" });
    applyAction(s, { seat: 1, type: "check" });
    expect(isRoundComplete(s)).toBe(true);
    startStreet(s, "flop");
    expect(s.toAct).toEqual([1, 2]);
  });
  it("big blind gets the option: a limped pot is not complete until BB acts", () => {
    const s = startHand({ players: players([1000, 1000, 1000]), buttonSeat: 1, smallBlind: 5, bigBlind: 10 });
    applyAction(s, { seat: 1, type: "call" });
    applyAction(s, { seat: 2, type: "call" });
    expect(isRoundComplete(s)).toBe(false);
    expect(legalActions(s).check).toBe(true);
    applyAction(s, { seat: 3, type: "check" });
    expect(isRoundComplete(s)).toBe(true);
  });
  it("rejects acting out of turn", () => {
    const s = startHand({ players: players([1000, 1000, 1000]), buttonSeat: 1, smallBlind: 5, bigBlind: 10 });
    expect(() => applyAction(s, { seat: 2, type: "call" })).toThrow(BettingError);
  });
});

describe("betting engine: raise-to semantics and min raise", () => {
  it("raise amount is the total for the street; min raise equals the last raise size", () => {
    const s = startHand({ players: players([1000, 1000, 1000]), buttonSeat: 1, smallBlind: 5, bigBlind: 10 });
    const la = legalActions(s);
    expect(la.raise).toEqual({ min: 20, max: 1000 });
    applyAction(s, { seat: 1, type: "raise", amount: 30 }); // raise 20 on top of 10
    expect(s.players[0].streetContribution).toBe(30);
    expect(legalActions(s).raise).toEqual({ min: 50, max: 1000 }); // must raise at least 20 more
    expect(() => applyAction(s, { seat: 2, type: "raise", amount: 45 })).toThrow(BettingError);
    applyAction(s, { seat: 2, type: "raise", amount: 90 }); // raise 60
    expect(legalActions(s).raise).toEqual({ min: 150, max: 1000 });
  });
  it("opening bet must be at least the big blind; raise below the current bet is illegal", () => {
    const s = startHand({ players: players([1000, 1000]), buttonSeat: 1, smallBlind: 5, bigBlind: 10 });
    applyAction(s, { seat: 1, type: "call" });
    applyAction(s, { seat: 2, type: "check" });
    startStreet(s, "flop");
    expect(() => applyAction(s, { seat: 2, type: "bet", amount: 5 })).toThrow(BettingError);
    expect(() => applyAction(s, { seat: 2, type: "raise", amount: 20 })).toThrow(BettingError);
    applyAction(s, { seat: 2, type: "bet", amount: 10 });
    expect(() => applyAction(s, { seat: 1, type: "raise", amount: 10 })).toThrow(BettingError);
    expect(() => applyAction(s, { seat: 1, type: "bet", amount: 30 })).toThrow(BettingError);
  });
  it("cannot check facing a bet; cannot call with nothing to call", () => {
    const s = startHand({ players: players([1000, 1000, 1000]), buttonSeat: 1, smallBlind: 5, bigBlind: 10 });
    expect(() => applyAction(s, { seat: 1, type: "check" })).toThrow(BettingError);
    applyAction(s, { seat: 1, type: "call" });
    applyAction(s, { seat: 2, type: "call" });
    expect(() => applyAction(s, { seat: 3, type: "call" })).toThrow(BettingError);
  });
  it("cannot raise more than the stack", () => {
    const s = startHand({ players: players([100, 1000, 1000]), buttonSeat: 1, smallBlind: 5, bigBlind: 10 });
    expect(() => applyAction(s, { seat: 1, type: "raise", amount: 101 })).toThrow(BettingError);
    applyAction(s, { seat: 1, type: "raise", amount: 100 });
    expect(s.players[0].allIn).toBe(true);
  });
});

describe("betting engine: all-in rules", () => {
  it("call for less: short stack calling is all-in for its stack", () => {
    const s = startHand({ players: players([1000, 1000, 40]), buttonSeat: 1, smallBlind: 5, bigBlind: 10 });
    applyAction(s, { seat: 1, type: "raise", amount: 100 });
    applyAction(s, { seat: 2, type: "call" });
    const e = applyAction(s, { seat: 3, type: "call" });
    expect(e.type).toBe("all_in");
    expect(e.chips).toBe(30);
    expect(s.players[2].allIn).toBe(true);
    expect(isRoundComplete(s)).toBe(true);
  });
  it("short all-in raise does not reopen betting for players who already acted", () => {
    const s = startHand({ players: players([1000, 1000, 1000, 125]), buttonSeat: 1, smallBlind: 5, bigBlind: 10 });
    // seat 4 is UTG? order after BB(3): 4,1,2,3
    applyAction(s, { seat: 4, type: "call" });
    applyAction(s, { seat: 1, type: "raise", amount: 100 });
    applyAction(s, { seat: 2, type: "call" });
    applyAction(s, { seat: 3, type: "fold" });
    const e = applyAction(s, { seat: 4, type: "all_in" }); // to 125: raise of 25 < min raise 90
    expect(e.type).toBe("all_in");
    expect(e.fullRaise).toBe(false);
    expect(s.toAct).toEqual([1, 2]);
    expect(legalActions(s).raise).toBeNull();
    expect(legalActions(s).allIn).toBeNull(); // an all-in here would be a raise, so it is not allowed either
    expect(() => applyAction(s, { seat: 1, type: "raise", amount: 300 })).toThrow(BettingError);
    expect(() => applyAction(s, { seat: 1, type: "all_in" })).toThrow(BettingError);
    applyAction(s, { seat: 1, type: "call" });
    applyAction(s, { seat: 2, type: "call" });
    expect(isRoundComplete(s)).toBe(true);
    expect(totalPot(s)).toBe(125 * 3 + 10);
  });
  it("full all-in raise reopens the betting", () => {
    const s = startHand({ players: players([1000, 1000, 1000, 250]), buttonSeat: 1, smallBlind: 5, bigBlind: 10 });
    applyAction(s, { seat: 4, type: "call" });
    applyAction(s, { seat: 1, type: "raise", amount: 100 });
    applyAction(s, { seat: 2, type: "call" });
    applyAction(s, { seat: 3, type: "fold" });
    const e = applyAction(s, { seat: 4, type: "all_in" }); // to 250: raise of 150 >= 90
    expect(e.fullRaise).toBe(true);
    expect(legalActions(s).raise).toEqual({ min: 400, max: 1000 });
  });
  it("all-in for less than the current bet counts as a call (no raise)", () => {
    const s = startHand({ players: players([1000, 1000, 60]), buttonSeat: 1, smallBlind: 5, bigBlind: 10 });
    applyAction(s, { seat: 1, type: "raise", amount: 100 });
    applyAction(s, { seat: 2, type: "call" });
    applyAction(s, { seat: 3, type: "all_in" });
    expect(s.currentBet).toBe(100);
    expect(isRoundComplete(s)).toBe(true);
  });
  it("all-in players do not act on later streets; the board is run out with no betting", () => {
    const s = startHand({ players: players([1000, 1000, 60]), buttonSeat: 1, smallBlind: 5, bigBlind: 10 });
    applyAction(s, { seat: 1, type: "all_in" });
    applyAction(s, { seat: 2, type: "call" });
    applyAction(s, { seat: 3, type: "call" });
    startStreet(s, "flop");
    expect(s.toAct).toEqual([]);
    startStreet(s, "turn");
    startStreet(s, "river");
    expect(s.toAct).toEqual([]);
  });
  it("when every opponent is all-in, the remaining player may only call or fold (no raise, no all-in)", () => {
    const s = startHand({ players: players([1000, 300, 200]), buttonSeat: 1, smallBlind: 5, bigBlind: 10 });
    applyAction(s, { seat: 1, type: "raise", amount: 30 });
    applyAction(s, { seat: 2, type: "all_in" }); // to 300
    applyAction(s, { seat: 3, type: "all_in" }); // to 200 (call for less)
    const la = legalActions(s);
    expect(la.seat).toBe(1);
    expect(la.call).toBe(270);
    expect(la.raise).toBeNull();
    expect(la.allIn).toBeNull();
    expect(() => applyAction(s, { seat: 1, type: "raise", amount: 600 })).toThrow(BettingError);
    expect(() => applyAction(s, { seat: 1, type: "all_in" })).toThrow(BettingError);
    applyAction(s, { seat: 1, type: "call" });
    expect(isRoundComplete(s)).toBe(true);
    expect(totalPot(s)).toBe(300 + 300 + 200);
  });
  it("heads-up: betting into a player who is already all-in is illegal", () => {
    const s = startHand({ players: players([1000, 100]), buttonSeat: 1, smallBlind: 5, bigBlind: 10 });
    applyAction(s, { seat: 1, type: "call" });
    applyAction(s, { seat: 2, type: "all_in" }); // BB shoves to 100
    expect(legalActions(s).raise).toBeNull();
    applyAction(s, { seat: 1, type: "call" });
    expect(isRoundComplete(s)).toBe(true);
  });
  it("a bet all-in below the big blind can be raised by at least the big blind", () => {
    const s = startHand({ players: players([1000, 1000, 16]), buttonSeat: 1, smallBlind: 5, bigBlind: 10 });
    applyAction(s, { seat: 1, type: "call" });
    applyAction(s, { seat: 2, type: "call" });
    applyAction(s, { seat: 3, type: "check" });
    startStreet(s, "flop");
    applyAction(s, { seat: 2, type: "check" });
    applyAction(s, { seat: 3, type: "all_in" }); // bet 6 all-in, below the BB
    expect(legalActions(s).raise).toEqual({ min: 16, max: 990 }); // 10 already in preflop
  });
});

describe("betting engine: hand over on folds", () => {
  it("everyone folds to a raise: hand ends, no more streets have action", () => {
    const s = startHand({ players: players([1000, 1000, 1000]), buttonSeat: 1, smallBlind: 5, bigBlind: 10 });
    applyAction(s, { seat: 1, type: "raise", amount: 30 });
    applyAction(s, { seat: 2, type: "fold" });
    applyAction(s, { seat: 3, type: "fold" });
    expect(s.handOver).toBe(true);
    expect(isRoundComplete(s)).toBe(true);
    expect(() => applyAction(s, { seat: 1, type: "check" })).toThrow(BettingError);
  });
});

describe("potCalculator", () => {
  const base = { players: players([1000, 1000, 1000, 1000]), buttonSeat: 1, smallBlind: 5, bigBlind: 10 };

  it("sums blinds, calls and raises across streets", () => {
    const h: HandHistory = {
      ...base,
      streets: [
        { street: "preflop", actions: [
          { seat: 4, type: "raise", amount: 30 }, { seat: 1, type: "call" }, { seat: 2, type: "fold" }, { seat: 3, type: "call" },
        ] },
        { street: "flop", actions: [
          { seat: 3, type: "check" }, { seat: 4, type: "bet", amount: 60 }, { seat: 1, type: "raise", amount: 180 }, { seat: 3, type: "fold" }, { seat: 4, type: "call" },
        ] },
        { street: "turn", actions: [{ seat: 4, type: "check" }, { seat: 1, type: "check" }] },
      ],
    };
    const r = calculatePot(h);
    expect(r.totalContributed).toBe(5 + 30 + 30 + 30 + 180 + 180);
    expect(r.pot).toBe(455);
    expect(r.breakdown.uncalled).toBeNull();
    expect(r.streetPots.map((s) => [s.street, s.potAfter, s.added])).toEqual([
      ["preflop", 95, 95], ["flop", 455, 360], ["turn", 455, 0],
    ]);
  });

  it("uncalled raise is returned when everyone folds", () => {
    const h: HandHistory = {
      ...base,
      streets: [{ street: "preflop", actions: [
        { seat: 4, type: "fold" }, { seat: 1, type: "raise", amount: 35 }, { seat: 2, type: "fold" }, { seat: 3, type: "fold" },
      ] }],
    };
    const r = calculatePot(h);
    expect(r.handOver).toBe(true);
    expect(r.totalContributed).toBe(50);
    expect(r.breakdown.uncalled).toEqual({ seat: 1, amount: 25 });
    // Blinds (15) plus the 10 of the raise that matched the big blind stay in the pot.
    expect(r.pot).toBe(25);
  });

  it("a check-around street adds nothing", () => {
    const h: HandHistory = {
      ...base,
      streets: [
        { street: "preflop", actions: [
          { seat: 4, type: "call" }, { seat: 1, type: "call" }, { seat: 2, type: "call" }, { seat: 3, type: "check" },
        ] },
        { street: "flop", actions: [
          { seat: 2, type: "check" }, { seat: 3, type: "check" }, { seat: 4, type: "check" }, { seat: 1, type: "check" },
        ] },
      ],
    };
    const r = calculatePot(h);
    expect(r.pot).toBe(40);
    expect(r.streetPots[1]).toEqual({ street: "flop", potAfter: 40, added: 0 });
  });

  it("multi-way all-ins produce main and side pots via the engine", () => {
    const h: HandHistory = {
      players: players([50, 200, 500, 500]), buttonSeat: 4, smallBlind: 5, bigBlind: 10,
      streets: [{ street: "preflop", actions: [
        { seat: 3, type: "all_in" }, { seat: 4, type: "call" }, { seat: 1, type: "all_in" }, { seat: 2, type: "all_in" },
      ] }],
    };
    const r = calculatePot(h);
    expect(r.pot).toBe(1250);
    expect(r.breakdown.pots.map((p) => [p.amount, p.eligible])).toEqual([
      [200, [1, 2, 3, 4]], [450, [2, 3, 4]], [600, [3, 4]],
    ]);
  });

  it("rejects an incomplete street", () => {
    const h: HandHistory = {
      ...base,
      streets: [{ street: "preflop", actions: [{ seat: 4, type: "raise", amount: 30 }] }],
    };
    expect(() => calculatePot(h)).toThrow(BettingError);
    expect(() => replayHand(h)).toThrow(BettingError);
  });
});

describe("antes", () => {
  it("antes are posted by everyone before the blinds and count toward the pot but not the street bet", () => {
    const s = startHand({ players: players([1000, 1000, 1000]), buttonSeat: 1, smallBlind: 5, bigBlind: 10, ante: 1 });
    expect(totalPot(s)).toBe(3 + 5 + 10);
    expect(s.currentBet).toBe(10);
    expect(s.players.map((p) => p.streetContribution)).toEqual([0, 5, 10]);
    expect(legalActions(s).call).toBe(10);
  });
  it("a player who cannot cover the ante is all-in for it", () => {
    const s = startHand({ players: players([1000, 1000, 1]), buttonSeat: 1, smallBlind: 5, bigBlind: 10, ante: 2 });
    expect(s.players[2].allIn).toBe(true);
    expect(s.players[2].totalContribution).toBe(1);
    expect(s.toAct).toEqual([1, 2]); // seat 3 (BB, all-in) never acts
  });
  it("calculatePot includes antes", () => {
    const r = calculatePot({
      players: players([1000, 1000]), buttonSeat: 1, smallBlind: 5, bigBlind: 10, ante: 3,
      streets: [{ street: "preflop", actions: [{ seat: 1, type: "call" }, { seat: 2, type: "check" }] }],
    });
    expect(r.pot).toBe(26);
  });
});
