/**
 * Skill tags attached to every generated scenario. Stats are aggregated per
 * skill so WEAKNESS TRAINING can find what the dealer struggles with and the
 * generator can bias future scenarios toward it.
 */
import { Card, sameCard } from "./cards";
import { HandCategory, HandValue } from "./handEvaluator";
import { compareHands } from "./handComparator";
import { PotResult } from "./potCalculator";

export type Mode = "hand-reading" | "winner" | "pot" | "side-pot";

export type SkillId =
  // hand reading
  | "high-card-detection" | "pair-detection" | "two-pair-detection" | "trips-detection" | "straight-detection"
  | "flush-detection" | "full-house-detection" | "quads-detection" | "straight-flush-detection"
  | "wheel-straight" | "board-play" | "kicker-selection" | "counterfeit"
  // winner
  | "hand-ranking" | "kicker-comparison" | "pair-comparison" | "two-pair-comparison" | "trips-comparison"
  | "straight-comparison" | "flush-comparison" | "full-house-comparison" | "quads-kicker" | "split-pot" | "board-play-split"
  // pot
  | "preflop-pot" | "multi-street-pot" | "raise-tracking" | "uncalled-bet"
  // side pot
  | "side-pot" | "multiple-side-pots" | "folded-contribution" | "uncalled-all-in";

export interface SkillInfo {
  id: SkillId;
  label: string;
  labelJa: string;
  mode: Mode;
}

export const SKILLS: Record<SkillId, SkillInfo> = {
  "high-card-detection": { id: "high-card-detection", label: "High Card Detection", labelJa: "ハイカード判定", mode: "hand-reading" },
  "pair-detection": { id: "pair-detection", label: "Pair Detection", labelJa: "ペア判定", mode: "hand-reading" },
  "two-pair-detection": { id: "two-pair-detection", label: "Two Pair Detection", labelJa: "ツーペア判定", mode: "hand-reading" },
  "trips-detection": { id: "trips-detection", label: "Trips Detection", labelJa: "スリーカード判定", mode: "hand-reading" },
  "straight-detection": { id: "straight-detection", label: "Straight Detection", labelJa: "ストレート判定", mode: "hand-reading" },
  "flush-detection": { id: "flush-detection", label: "Flush Detection", labelJa: "フラッシュ判定", mode: "hand-reading" },
  "full-house-detection": { id: "full-house-detection", label: "Full House Detection", labelJa: "フルハウス判定", mode: "hand-reading" },
  "quads-detection": { id: "quads-detection", label: "Quads Detection", labelJa: "フォーカード判定", mode: "hand-reading" },
  "straight-flush-detection": { id: "straight-flush-detection", label: "Straight Flush Detection", labelJa: "ストレートフラッシュ判定", mode: "hand-reading" },
  "wheel-straight": { id: "wheel-straight", label: "Wheel Straight", labelJa: "ホイール（A-2-3-4-5）", mode: "hand-reading" },
  "board-play": { id: "board-play", label: "Board Play", labelJa: "ボードプレイ", mode: "hand-reading" },
  "kicker-selection": { id: "kicker-selection", label: "Kicker Selection", labelJa: "キッカー選択", mode: "hand-reading" },
  "counterfeit": { id: "counterfeit", label: "Counterfeit", labelJa: "カウンターフェイト", mode: "hand-reading" },
  "hand-ranking": { id: "hand-ranking", label: "Hand Ranking", labelJa: "役の強弱", mode: "winner" },
  "kicker-comparison": { id: "kicker-comparison", label: "Kicker Comparison", labelJa: "キッカー比較", mode: "winner" },
  "pair-comparison": { id: "pair-comparison", label: "Pair Comparison", labelJa: "ペア比較", mode: "winner" },
  "two-pair-comparison": { id: "two-pair-comparison", label: "Two Pair Comparison", labelJa: "ツーペア比較", mode: "winner" },
  "trips-comparison": { id: "trips-comparison", label: "Trips Comparison", labelJa: "スリーカード比較", mode: "winner" },
  "straight-comparison": { id: "straight-comparison", label: "Straight Comparison", labelJa: "ストレート比較", mode: "winner" },
  "flush-comparison": { id: "flush-comparison", label: "Flush Comparison", labelJa: "フラッシュ比較", mode: "winner" },
  "full-house-comparison": { id: "full-house-comparison", label: "Full House Comparison", labelJa: "フルハウス比較", mode: "winner" },
  "quads-kicker": { id: "quads-kicker", label: "Quads Kicker", labelJa: "フォーカードのキッカー", mode: "winner" },
  "split-pot": { id: "split-pot", label: "Split Pot", labelJa: "スプリットポット", mode: "winner" },
  "board-play-split": { id: "board-play-split", label: "Board Play Split", labelJa: "ボードプレイ（全員スプリット）", mode: "winner" },
  "preflop-pot": { id: "preflop-pot", label: "Preflop Pot", labelJa: "プリフロップのポット", mode: "pot" },
  "multi-street-pot": { id: "multi-street-pot", label: "Multi-street Pot", labelJa: "複数ストリートのポット", mode: "pot" },
  "raise-tracking": { id: "raise-tracking", label: "Raise Tracking", labelJa: "レイズ額の追跡", mode: "pot" },
  "uncalled-bet": { id: "uncalled-bet", label: "Uncalled Bet", labelJa: "未コールベットの返却", mode: "pot" },
  "side-pot": { id: "side-pot", label: "Side Pot", labelJa: "サイドポット", mode: "side-pot" },
  "multiple-side-pots": { id: "multiple-side-pots", label: "Multiple Side Pots", labelJa: "複数サイドポット", mode: "side-pot" },
  "folded-contribution": { id: "folded-contribution", label: "Folded Player Contribution", labelJa: "フォールド者の投入分", mode: "side-pot" },
  "uncalled-all-in": { id: "uncalled-all-in", label: "Uncalled All-in", labelJa: "未コールオールインの返却", mode: "side-pot" },
};

export const SKILL_IDS = Object.keys(SKILLS) as SkillId[];

const DETECTION: Record<HandCategory, SkillId> = {
  [HandCategory.HighCard]: "high-card-detection",
  [HandCategory.OnePair]: "pair-detection",
  [HandCategory.TwoPair]: "two-pair-detection",
  [HandCategory.ThreeOfAKind]: "trips-detection",
  [HandCategory.Straight]: "straight-detection",
  [HandCategory.Flush]: "flush-detection",
  [HandCategory.FullHouse]: "full-house-detection",
  [HandCategory.FourOfAKind]: "quads-detection",
  [HandCategory.StraightFlush]: "straight-flush-detection",
};

const COMPARISON: Partial<Record<HandCategory, SkillId>> = {
  [HandCategory.OnePair]: "pair-comparison",
  [HandCategory.TwoPair]: "two-pair-comparison",
  [HandCategory.ThreeOfAKind]: "trips-comparison",
  [HandCategory.Straight]: "straight-comparison",
  [HandCategory.Flush]: "flush-comparison",
  [HandCategory.FullHouse]: "full-house-comparison",
};

export function isBoardPlay(hand: HandValue, board: readonly Card[]): boolean {
  return hand.bestFive.every((c) => board.some((b) => sameCard(b, c)));
}

function pairRanksOnBoard(board: readonly Card[]): number[] {
  const counts = new Map<number, number>();
  for (const c of board) counts.set(c.rank, (counts.get(c.rank) ?? 0) + 1);
  return [...counts.entries()].filter(([, n]) => n >= 2).map(([r]) => r);
}

/** Skills exercised by a HAND READING scenario. */
export function classifyHandReading(hole: readonly Card[], board: readonly Card[], hand: HandValue): SkillId[] {
  const out = new Set<SkillId>([DETECTION[hand.category]]);
  if ((hand.category === HandCategory.Straight || hand.category === HandCategory.StraightFlush) && hand.tiebreak[0] === 5) out.add("wheel-straight");
  if (isBoardPlay(hand, board)) out.add("board-play");
  const all = [...hole, ...board];
  const counts = new Map<number, number>();
  for (const c of all) counts.set(c.rank, (counts.get(c.rank) ?? 0) + 1);
  const pairs = [...counts.values()].filter((n) => n === 2).length;
  if ((hand.category === HandCategory.TwoPair && pairs >= 3) || (hand.category === HandCategory.OnePair && hole.some((h) => hand.bestFive.some((b) => sameCard(b, h)) && h.rank !== hand.tiebreak[0]))) {
    out.add("kicker-selection");
  }
  // Counterfeit: pocket pair below two board pairs, so the hole pair does not play.
  const boardPairs = pairRanksOnBoard(board);
  if (hole.length === 2 && hole[0].rank === hole[1].rank && boardPairs.length >= 2 && boardPairs.every((r) => r > hole[0].rank) && hand.category === HandCategory.TwoPair) {
    out.add("counterfeit");
  }
  return [...out];
}

/** Skills exercised by a WINNER scenario. */
export function classifyWinner(hands: readonly { seat: number; hand: HandValue }[], winners: readonly number[], board: readonly Card[]): SkillId[] {
  const out = new Set<SkillId>();
  const sorted = hands.map((h) => h.hand).sort((a, b) => compareHands(b, a));
  const best = sorted[0];
  const second = sorted[1];
  if (winners.length > 1) {
    out.add("split-pot");
    if (isBoardPlay(best, board)) out.add("board-play-split");
  }
  if (second && best.category === second.category) {
    const cmp = COMPARISON[best.category];
    if (cmp) out.add(cmp);
    if (best.category === HandCategory.FourOfAKind) out.add("quads-kicker");
    if (best.category === HandCategory.HighCard) out.add("kicker-comparison");
    // Same primary rank(s) means only the kicker decides.
    const primaryLen = best.category === HandCategory.TwoPair ? 2 : 1;
    if ([HandCategory.OnePair, HandCategory.TwoPair, HandCategory.ThreeOfAKind, HandCategory.FourOfAKind].includes(best.category)
      && best.tiebreak.slice(0, primaryLen).every((r, i) => r === second.tiebreak[i]) && winners.length === 1) {
      out.add("kicker-comparison");
    }
    if (best.category === HandCategory.TwoPair && pairRanksOnBoard(board).length >= 2) out.add("counterfeit");
  } else {
    out.add("hand-ranking");
  }
  return [...out];
}

/** Skills exercised by a POT scenario. */
export function classifyPot(result: PotResult): SkillId[] {
  const out = new Set<SkillId>();
  const streets = new Set(result.state.log.map((e) => e.street));
  out.add(streets.size > 1 ? "multi-street-pot" : "preflop-pot");
  const raises = result.state.log.filter((e) => e.type === "raise" || e.type === "bet").length;
  if (raises >= 3) out.add("raise-tracking");
  if (result.breakdown.uncalled) out.add("uncalled-bet");
  return [...out];
}

/** Skills exercised by a SIDE POT scenario. */
export function classifySidePot(result: PotResult): SkillId[] {
  const out = new Set<SkillId>(["side-pot"]);
  if (result.breakdown.pots.length >= 3) out.add("multiple-side-pots");
  if (result.contributions.some((c) => c.folded && c.amount > 0)) out.add("folded-contribution");
  if (result.breakdown.uncalled) out.add("uncalled-all-in");
  return [...out];
}
