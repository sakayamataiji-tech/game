/**
 * Card primitives shared by the whole rules engine.
 * Ranks are numeric (2..14, Ace = 14) so comparisons are plain integer math.
 */

export type Rank = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14;
export type Suit = "s" | "h" | "d" | "c";

export interface Card {
  readonly rank: Rank;
  readonly suit: Suit;
}

export const RANKS: readonly Rank[] = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
export const SUITS: readonly Suit[] = ["s", "h", "d", "c"];

const RANK_CHARS = "23456789TJQKA";

export const RANK_LABEL: Record<Rank, string> = {
  2: "2", 3: "3", 4: "4", 5: "5", 6: "6", 7: "7", 8: "8", 9: "9",
  10: "T", 11: "J", 12: "Q", 13: "K", 14: "A",
};

export const RANK_WORD: Record<Rank, string> = {
  2: "Two", 3: "Three", 4: "Four", 5: "Five", 6: "Six", 7: "Seven", 8: "Eight",
  9: "Nine", 10: "Ten", 11: "Jack", 12: "Queen", 13: "King", 14: "Ace",
};

export const SUIT_SYMBOL: Record<Suit, string> = { s: "♠", h: "♥", d: "♦", c: "♣" };

export function card(rank: Rank, suit: Suit): Card {
  return { rank, suit };
}

/** Parse a two character card string such as "As", "Td" or "9c". */
export function parseCard(text: string): Card {
  const t = text.trim();
  if (t.length !== 2) throw new Error(`Invalid card: "${text}"`);
  const r = RANK_CHARS.indexOf(t[0].toUpperCase());
  const suit = t[1].toLowerCase() as Suit;
  if (r < 0 || !SUITS.includes(suit)) throw new Error(`Invalid card: "${text}"`);
  return { rank: (r + 2) as Rank, suit };
}

/** Parse a whitespace separated list of cards, e.g. "As Kd 7c". */
export function parseCards(text: string): Card[] {
  return text.split(/[\s,]+/).filter(Boolean).map(parseCard);
}

export function cardToString(c: Card): string {
  return `${RANK_LABEL[c.rank]}${c.suit}`;
}

export function cardsToString(cards: readonly Card[]): string {
  return cards.map(cardToString).join(" ");
}

export function cardId(c: Card): number {
  return (c.rank - 2) * 4 + SUITS.indexOf(c.suit);
}

export function sameCard(a: Card, b: Card): boolean {
  return a.rank === b.rank && a.suit === b.suit;
}
