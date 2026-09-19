import { Card, Rank, RANK_WORD } from "./cards";

/**
 * Hand categories in ascending strength. Royal flush is the top straight flush
 * (Ace high) and is reported through `isRoyalFlush`, not as a separate category.
 */
export enum HandCategory {
  HighCard = 0,
  OnePair = 1,
  TwoPair = 2,
  ThreeOfAKind = 3,
  Straight = 4,
  Flush = 5,
  FullHouse = 6,
  FourOfAKind = 7,
  StraightFlush = 8,
}

export const HAND_CATEGORIES: readonly HandCategory[] = [
  HandCategory.HighCard,
  HandCategory.OnePair,
  HandCategory.TwoPair,
  HandCategory.ThreeOfAKind,
  HandCategory.Straight,
  HandCategory.Flush,
  HandCategory.FullHouse,
  HandCategory.FourOfAKind,
  HandCategory.StraightFlush,
];

export const HAND_CATEGORY_NAME: Record<HandCategory, string> = {
  [HandCategory.HighCard]: "High Card",
  [HandCategory.OnePair]: "One Pair",
  [HandCategory.TwoPair]: "Two Pair",
  [HandCategory.ThreeOfAKind]: "Three of a Kind",
  [HandCategory.Straight]: "Straight",
  [HandCategory.Flush]: "Flush",
  [HandCategory.FullHouse]: "Full House",
  [HandCategory.FourOfAKind]: "Four of a Kind",
  [HandCategory.StraightFlush]: "Straight Flush",
};

export interface HandValue {
  category: HandCategory;
  /**
   * Tie-break ranks, most significant first. Two hands of the same category
   * compare by this array lexicographically. Always exactly 5 numbers so that
   * comparison never depends on category-specific lengths.
   */
  tiebreak: number[];
  /** The 5 cards that make the hand (best five of the input). */
  bestFive: Card[];
  /** True for A-K-Q-J-T of one suit. */
  isRoyalFlush: boolean;
  /** Human readable name, e.g. "Full House, Kings full of Sevens". */
  description: string;
}

function plural(rank: Rank): string {
  const w = RANK_WORD[rank];
  return rank === 6 ? "Sixes" : `${w}s`;
}

/** Returns the high card of a 5-card straight in the given rank set, or 0. */
function straightHigh(rankSet: Set<number>): number {
  // Ace also plays low (wheel: A-2-3-4-5). No wrap-around (Q-K-A-2-3 is not a straight).
  for (let high = 14; high >= 5; high--) {
    let ok = true;
    for (let r = high; r > high - 5; r--) {
      const rr = r === 1 ? 14 : r;
      if (!rankSet.has(rr)) { ok = false; break; }
    }
    if (ok) return high;
  }
  return 0;
}

function straightCards(cards: readonly Card[], high: number): Card[] {
  const out: Card[] = [];
  for (let r = high; r > high - 5; r--) {
    const rr = r === 1 ? 14 : r;
    const c = cards.find((x) => x.rank === rr && !out.includes(x));
    if (!c) throw new Error("straightCards: rank missing");
    out.push(c);
  }
  return out;
}

const byRankDesc = (a: Card, b: Card) => b.rank - a.rank;

/**
 * Evaluate the best 5-card poker hand from 5 to 7 cards.
 * Standard NLH ranking: high card < pair < two pair < trips < straight < flush
 * < full house < quads < straight flush. Suits never break ties.
 */
export function evaluateHand(input: readonly Card[]): HandValue {
  if (input.length < 5 || input.length > 7) {
    throw new Error(`evaluateHand expects 5..7 cards, got ${input.length}`);
  }
  const seen = new Set<string>();
  for (const c of input) {
    const k = `${c.rank}${c.suit}`;
    if (seen.has(k)) throw new Error(`Duplicate card ${k}`);
    seen.add(k);
  }

  const cards = input.slice().sort(byRankDesc);

  // --- Flush / straight flush -------------------------------------------
  const bySuit = new Map<string, Card[]>();
  for (const c of cards) {
    const arr = bySuit.get(c.suit) ?? [];
    arr.push(c);
    bySuit.set(c.suit, arr);
  }
  let flushCards: Card[] | null = null;
  for (const arr of bySuit.values()) {
    if (arr.length >= 5) { flushCards = arr; break; } // at most one suit can have 5+ of 7
  }

  if (flushCards) {
    const sfHigh = straightHigh(new Set(flushCards.map((c) => c.rank)));
    if (sfHigh > 0) {
      const five = straightCards(flushCards, sfHigh);
      const royal = sfHigh === 14;
      return {
        category: HandCategory.StraightFlush,
        tiebreak: [sfHigh, 0, 0, 0, 0],
        bestFive: five,
        isRoyalFlush: royal,
        description: royal
          ? "Royal Flush"
          : `Straight Flush, ${RANK_WORD[sfHigh as Rank]} high`,
      };
    }
  }

  // --- Rank multiplicities -----------------------------------------------
  const countByRank = new Map<number, Card[]>();
  for (const c of cards) {
    const arr = countByRank.get(c.rank) ?? [];
    arr.push(c);
    countByRank.set(c.rank, arr);
  }
  // groups sorted by count desc, then rank desc
  const groups = [...countByRank.entries()]
    .map(([rank, cs]) => ({ rank, cards: cs }))
    .sort((a, b) => b.cards.length - a.cards.length || b.rank - a.rank);

  const quads = groups.filter((g) => g.cards.length === 4);
  const trips = groups.filter((g) => g.cards.length === 3);
  const pairs = groups.filter((g) => g.cards.length === 2);

  if (quads.length > 0) {
    const q = quads[0];
    const kicker = cards.find((c) => c.rank !== q.rank)!;
    return {
      category: HandCategory.FourOfAKind,
      tiebreak: [q.rank, kicker.rank, 0, 0, 0],
      bestFive: [...q.cards, kicker],
      isRoyalFlush: false,
      description: `Four of a Kind, ${plural(q.rank as Rank)}`,
    };
  }

  if (trips.length > 0 && (pairs.length > 0 || trips.length > 1)) {
    const t = trips[0];
    // The pair part is the best of: another trips (using 2 of its cards) or the highest pair.
    const candidates: { rank: number; cards: Card[] }[] = [];
    if (trips.length > 1) candidates.push({ rank: trips[1].rank, cards: trips[1].cards.slice(0, 2) });
    if (pairs.length > 0) candidates.push({ rank: pairs[0].rank, cards: pairs[0].cards });
    candidates.sort((a, b) => b.rank - a.rank);
    const p = candidates[0];
    return {
      category: HandCategory.FullHouse,
      tiebreak: [t.rank, p.rank, 0, 0, 0],
      bestFive: [...t.cards, ...p.cards],
      isRoyalFlush: false,
      description: `Full House, ${plural(t.rank as Rank)} full of ${plural(p.rank as Rank)}`,
    };
  }

  if (flushCards) {
    const five = flushCards.slice(0, 5);
    return {
      category: HandCategory.Flush,
      tiebreak: five.map((c) => c.rank),
      bestFive: five,
      isRoyalFlush: false,
      description: `Flush, ${RANK_WORD[five[0].rank]} high`,
    };
  }

  const stHigh = straightHigh(new Set(cards.map((c) => c.rank)));
  if (stHigh > 0) {
    return {
      category: HandCategory.Straight,
      tiebreak: [stHigh, 0, 0, 0, 0],
      bestFive: straightCards(cards, stHigh),
      isRoyalFlush: false,
      description: `Straight, ${RANK_WORD[stHigh as Rank]} high`,
    };
  }

  if (trips.length > 0) {
    const t = trips[0];
    const kickers = cards.filter((c) => c.rank !== t.rank).slice(0, 2);
    return {
      category: HandCategory.ThreeOfAKind,
      tiebreak: [t.rank, kickers[0].rank, kickers[1].rank, 0, 0],
      bestFive: [...t.cards, ...kickers],
      isRoyalFlush: false,
      description: `Three of a Kind, ${plural(t.rank as Rank)}`,
    };
  }

  if (pairs.length >= 2) {
    const [hp, lp] = pairs; // already sorted by rank desc
    const kicker = cards.find((c) => c.rank !== hp.rank && c.rank !== lp.rank)!;
    return {
      category: HandCategory.TwoPair,
      tiebreak: [hp.rank, lp.rank, kicker.rank, 0, 0],
      bestFive: [...hp.cards, ...lp.cards, kicker],
      isRoyalFlush: false,
      description: `Two Pair, ${plural(hp.rank as Rank)} and ${plural(lp.rank as Rank)}`,
    };
  }

  if (pairs.length === 1) {
    const p = pairs[0];
    const kickers = cards.filter((c) => c.rank !== p.rank).slice(0, 3);
    return {
      category: HandCategory.OnePair,
      tiebreak: [p.rank, kickers[0].rank, kickers[1].rank, kickers[2].rank, 0],
      bestFive: [...p.cards, ...kickers],
      isRoyalFlush: false,
      description: `One Pair, ${plural(p.rank as Rank)}`,
    };
  }

  const five = cards.slice(0, 5);
  return {
    category: HandCategory.HighCard,
    tiebreak: five.map((c) => c.rank),
    bestFive: five,
    isRoyalFlush: false,
    description: `High Card, ${RANK_WORD[five[0].rank]} high`,
  };
}
