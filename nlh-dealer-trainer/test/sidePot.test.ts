import { describe, it, expect } from "vitest";
import { calculateSidePots } from "@/engine/sidePotCalculator";

const c = (seat: number, amount: number, folded = false) => ({ seat, amount, folded });

describe("sidePotCalculator (§21 edge cases)", () => {
  it("no all-ins: a single main pot", () => {
    const r = calculateSidePots([c(1, 100), c(2, 100), c(3, 100)]);
    expect(r.pots).toEqual([{ amount: 300, eligible: [1, 2, 3], level: 100 }]);
    expect(r.uncalled).toBeNull();
    expect(r.total).toBe(300);
  });

  it("three all-ins of different sizes plus a caller: main + two side pots", () => {
    const r = calculateSidePots([c(1, 50), c(2, 200), c(3, 500), c(4, 500)]);
    expect(r.pots).toEqual([
      { amount: 200, eligible: [1, 2, 3, 4], level: 50 },
      { amount: 450, eligible: [2, 3, 4], level: 200 },
      { amount: 600, eligible: [3, 4], level: 500 },
    ]);
    expect(r.total).toBe(1250);
  });

  it("two all-ins with identical stacks do not create an extra pot", () => {
    const r = calculateSidePots([c(1, 300), c(2, 300), c(3, 800), c(4, 800)]);
    expect(r.pots.length).toBe(2);
    expect(r.pots[0]).toEqual({ amount: 1200, eligible: [1, 2, 3, 4], level: 300 });
    expect(r.pots[1]).toEqual({ amount: 1000, eligible: [3, 4], level: 800 });
  });

  it("folded player's chips stay in the pots but they are never eligible", () => {
    const r = calculateSidePots([c(1, 50), c(2, 200), c(3, 200), c(4, 120, true)]);
    expect(r.pots).toEqual([
      { amount: 200, eligible: [1, 2, 3], level: 50 },
      { amount: 370, eligible: [2, 3], level: 200 }, // 150 + 150 + 70 from the folder
    ]);
  });

  it("uncalled bet is returned and excluded from the pot", () => {
    // seat 1 all-in 100, seat 2 shoves 300, nobody else: 200 goes back to seat 2.
    const r = calculateSidePots([c(1, 100), c(2, 300)]);
    expect(r.uncalled).toEqual({ seat: 2, amount: 200 });
    expect(r.pots).toEqual([{ amount: 200, eligible: [1, 2], level: 100 }]);
  });

  it("uncalled raise after everyone folds: raiser gets the raise back, wins the rest", () => {
    // blinds 1/2, seat 3 raises to 6, all fold
    const r = calculateSidePots([c(1, 1, true), c(2, 2, true), c(3, 6)]);
    expect(r.uncalled).toEqual({ seat: 3, amount: 4 });
    expect(r.pots).toEqual([{ amount: 5, eligible: [3], level: 2 }]);
    expect(r.total).toBe(5);
  });

  it("uncalled portion is measured against folded players too", () => {
    // seat 2 called 300 then folded on a later street; seat 3 has 500 in, seat 1 all-in 100
    const r = calculateSidePots([c(1, 100), c(2, 300, true), c(3, 500)]);
    expect(r.uncalled).toEqual({ seat: 3, amount: 200 });
    expect(r.pots).toEqual([
      { amount: 300, eligible: [1, 3], level: 100 },
      { amount: 400, eligible: [3], level: 300 },
    ]);
  });

  it("all-in for less than the big blind creates a tiny main pot", () => {
    // blinds 5/10; seat 3 all-in 4; seats 1 and 2 (blinds) call to 10
    const r = calculateSidePots([c(1, 10), c(2, 10), c(3, 4)]);
    expect(r.pots).toEqual([
      { amount: 12, eligible: [1, 2, 3], level: 4 },
      { amount: 12, eligible: [1, 2], level: 10 },
    ]);
  });

  it("big blind all-in for less than the blind", () => {
    // blinds 25/50, BB (seat 2) only has 30; seat 3 calls 50, seat 1 completes to 50
    const r = calculateSidePots([c(1, 50), c(2, 30), c(3, 50)]);
    expect(r.pots).toEqual([
      { amount: 90, eligible: [1, 2, 3], level: 30 },
      { amount: 40, eligible: [1, 3], level: 50 },
    ]);
  });

  it("everyone all-in for exactly the same amount: one pot", () => {
    const r = calculateSidePots([c(1, 400), c(2, 400), c(3, 400)]);
    expect(r.pots.length).toBe(1);
    expect(r.pots[0].amount).toBe(1200);
  });

  it("sum of pots plus uncalled always equals the total contributed", () => {
    const input = [c(1, 37), c(2, 120), c(3, 120), c(4, 999), c(5, 88, true), c(6, 5, true)];
    const r = calculateSidePots(input);
    const total = input.reduce((s, x) => s + x.amount, 0);
    expect(r.total + (r.uncalled?.amount ?? 0)).toBe(total);
    expect(r.uncalled).toEqual({ seat: 4, amount: 879 });
  });

  it("zero contributions are ignored (no empty pots)", () => {
    const r = calculateSidePots([c(1, 0), c(2, 0)]);
    expect(r.pots).toEqual([]);
    expect(r.total).toBe(0);
  });

  it("rejects negative contributions", () => {
    expect(() => calculateSidePots([c(1, -1)])).toThrow();
  });
});
