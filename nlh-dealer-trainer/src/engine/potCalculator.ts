import { HandHistory, HandState, replayHand, Street, STREETS } from "./betting";
import { calculateSidePots, PotBreakdown } from "./sidePotCalculator";

export interface StreetPot {
  street: Street;
  /** All chips contributed up to the end of this street (before returning uncalled bets). */
  potAfter: number;
  /** Chips added on this street. */
  added: number;
}

export interface PotResult {
  /** Final engine state after replaying the history. */
  state: HandState;
  /** Every chip put in by every player (blinds included). */
  totalContributed: number;
  /** Chips actually in play as pot(s) after uncalled bets are returned. */
  pot: number;
  breakdown: PotBreakdown;
  /** Per seat total contribution. */
  contributions: { seat: number; amount: number; folded: boolean }[];
  streetPots: StreetPot[];
  /** True when everyone but one player folded. */
  handOver: boolean;
}

/** Replay a hand history and compute the pot(s). All numbers come from the engine. */
export function calculatePot(history: HandHistory): PotResult {
  const state = replayHand(history);
  const contributions = state.players.map((p) => ({ seat: p.seat, amount: p.totalContribution, folded: p.folded }));
  const breakdown = calculateSidePots(contributions);
  const totalContributed = contributions.reduce((s, c) => s + c.amount, 0);

  const streetPots: StreetPot[] = [];
  let prev = 0;
  for (const street of STREETS) {
    const entries = state.log.filter((e) => e.street === street);
    if (entries.length === 0 && !history.streets.some((s) => s.street === street)) continue;
    const potAfter = entries.length > 0 ? entries[entries.length - 1].potAfter : prev;
    streetPots.push({ street, potAfter, added: potAfter - prev });
    prev = potAfter;
  }

  return {
    state,
    totalContributed,
    pot: breakdown.total,
    breakdown,
    contributions,
    streetPots,
    handOver: state.handOver,
  };
}
