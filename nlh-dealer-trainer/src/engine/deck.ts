import { Card, RANKS, SUITS } from "./cards";

/** A fresh, ordered 52 card deck. */
export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const rank of RANKS) {
    for (const suit of SUITS) deck.push({ rank, suit });
  }
  return deck;
}

/** Remove specific cards from a deck (used when scenarios pre-place cards). */
export function removeCards(deck: readonly Card[], remove: readonly Card[]): Card[] {
  return deck.filter((c) => !remove.some((r) => r.rank === c.rank && r.suit === c.suit));
}
