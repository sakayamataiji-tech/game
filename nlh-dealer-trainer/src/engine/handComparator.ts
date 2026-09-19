import { Card } from "./cards";
import { evaluateHand, HandValue } from "./handEvaluator";

/** Negative if a < b, positive if a > b, 0 if the hands tie exactly. */
export function compareHands(a: HandValue, b: HandValue): number {
  if (a.category !== b.category) return a.category - b.category;
  for (let i = 0; i < 5; i++) {
    const d = (a.tiebreak[i] ?? 0) - (b.tiebreak[i] ?? 0);
    if (d !== 0) return d;
  }
  return 0;
}

export interface ShowdownEntry<Id = number> {
  id: Id;
  holeCards: readonly Card[];
}

export interface ShowdownResult<Id = number> {
  /** Ids of all players sharing the best hand (length > 1 means a split). */
  winners: Id[];
  /** Every player's evaluated hand, in input order. */
  hands: { id: Id; hand: HandValue }[];
}

/**
 * Determine the winner(s) between players given a shared board.
 * The engine always returns every tied player; callers decide what to do with a split.
 */
export function determineWinners<Id>(
  players: readonly ShowdownEntry<Id>[],
  board: readonly Card[],
): ShowdownResult<Id> {
  if (players.length === 0) throw new Error("determineWinners: no players");
  const hands = players.map((p) => ({ id: p.id, hand: evaluateHand([...p.holeCards, ...board]) }));
  let best: HandValue | null = null;
  let winners: Id[] = [];
  for (const h of hands) {
    if (best === null) { best = h.hand; winners = [h.id]; continue; }
    const c = compareHands(h.hand, best);
    if (c > 0) { best = h.hand; winners = [h.id]; }
    else if (c === 0) winners.push(h.id);
  }
  return { winners, hands };
}

/** Rank players from best to worst; tied players share a rank number. */
export function rankHands<Id>(hands: readonly { id: Id; hand: HandValue }[]): { id: Id; hand: HandValue; rank: number }[] {
  const sorted = hands.slice().sort((a, b) => compareHands(b.hand, a.hand));
  let rank = 0;
  return sorted.map((h, i) => {
    if (i === 0 || compareHands(h.hand, sorted[i - 1].hand) !== 0) rank = i + 1;
    return { ...h, rank };
  });
}
