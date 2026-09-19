/**
 * Pure side pot math. Input is what each seat put in over the whole hand and
 * whether they folded; output is the list of pots (main pot first) with the
 * seats eligible to win each, plus any uncalled amount to return.
 */

export interface Contribution {
  seat: number;
  amount: number;
  folded: boolean;
}

export interface Pot {
  /** Chips in this pot. */
  amount: number;
  /** Seats that can win this pot (not folded, contributed up to this level). */
  eligible: number[];
  /** Contribution level (per player cap) that closes this pot. */
  level: number;
}

export interface PotBreakdown {
  /** Main pot first, then side pots in creation order. Never contains an empty pot. */
  pots: Pot[];
  /** Portion of the largest bet nobody matched, returned to its owner. */
  uncalled: { seat: number; amount: number } | null;
  /** Sum of all pots (what is actually awarded). */
  total: number;
}

export function calculateSidePots(contributions: readonly Contribution[]): PotBreakdown {
  if (contributions.length === 0) return { pots: [], uncalled: null, total: 0 };
  for (const c of contributions) {
    if (c.amount < 0 || !Number.isFinite(c.amount)) throw new Error(`bad contribution for seat ${c.seat}`);
  }
  const contribs = contributions.map((c) => ({ ...c }));
  const live = contribs.filter((c) => !c.folded);

  // 1. Return the uncalled portion of the biggest bet: a live player whose
  //    contribution exceeds every other player's (folded ones included) gets
  //    the excess back; nobody matched it so it is not part of any pot.
  let uncalled: PotBreakdown["uncalled"] = null;
  if (live.length > 0) {
    const top = live.reduce((a, b) => (b.amount > a.amount ? b : a));
    const secondHighest = contribs
      .filter((c) => c.seat !== top.seat)
      .reduce((m, c) => Math.max(m, c.amount), 0);
    if (top.amount > secondHighest) {
      uncalled = { seat: top.seat, amount: top.amount - secondHighest };
      top.amount = secondHighest;
    }
  }

  // 2. Build pots at each distinct contribution level of the live players.
  const levels = [...new Set(live.map((c) => c.amount))].filter((l) => l > 0).sort((a, b) => a - b);
  const pots: Pot[] = [];
  let prev = 0;
  for (const level of levels) {
    let amount = 0;
    for (const c of contribs) amount += Math.max(0, Math.min(c.amount, level) - prev);
    const eligible = live.filter((c) => c.amount >= level).map((c) => c.seat).sort((a, b) => a - b);
    if (amount > 0) pots.push({ amount, eligible, level });
    prev = level;
  }
  // Chips from folded players above the highest live level cannot exist after
  // step 1 unless every live player is below a folded player's bet; add them
  // to the last pot (they belong to whoever wins it).
  let leftover = 0;
  for (const c of contribs) leftover += Math.max(0, c.amount - prev);
  if (leftover > 0) {
    if (pots.length === 0) {
      pots.push({ amount: leftover, eligible: live.map((c) => c.seat), level: prev });
    } else {
      pots[pots.length - 1].amount += leftover;
    }
  }

  const total = pots.reduce((s, p) => s + p.amount, 0);
  return { pots, uncalled, total };
}
