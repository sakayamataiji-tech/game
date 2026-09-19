import { LogEntry, HandState, Street, STREET_LABEL } from "@/engine/betting";
import { Card, RANK_LABEL, SUIT_SYMBOL } from "@/engine/cards";
import { HandCategory, HAND_CATEGORY_NAME } from "@/engine/handEvaluator";
import type { Mode } from "@/engine/scenarioGenerator";
import type { TrainMode } from "./session";

export const MODE_INFO: Record<TrainMode, { title: string; subtitle: string; description: string; shortcut: string }> = {
  "hand-reading": {
    title: "HAND READING",
    subtitle: "役判定",
    description: "ボード5枚とホールカード2枚から、最強の5枚で作れる役を答える。",
    shortcut: "1〜9 キーで回答",
  },
  winner: {
    title: "WINNER",
    subtitle: "勝者判定",
    description: "ショウダウンした全員のハンドを比較し、勝者（全員同じ強さなら SPLIT）を答える。",
    shortcut: "1〜6 キーで席、S で SPLIT",
  },
  pot: {
    title: "POT",
    subtitle: "ポット計算",
    description: "ブラインドからのアクションを追い、ポットを暗算する。レイズは「raise to（合計額）」表記。",
    shortcut: "数字キーで入力、Enter で決定",
  },
  "side-pot": {
    title: "SIDE POT",
    subtitle: "サイドポット計算",
    description: "オールインを含むアクションから、メインポットと各サイドポットを順に答える。",
    shortcut: "数字キーで入力、Enter で決定",
  },
  quick: {
    title: "QUICK TRAINING",
    subtitle: "ランダム出題",
    description: "4カテゴリからランダムに出題。苦手なカテゴリが多めに出る。",
    shortcut: "",
  },
};

export const CATEGORY_JA: Record<HandCategory, string> = {
  [HandCategory.HighCard]: "ハイカード",
  [HandCategory.OnePair]: "ワンペア",
  [HandCategory.TwoPair]: "ツーペア",
  [HandCategory.ThreeOfAKind]: "スリーカード",
  [HandCategory.Straight]: "ストレート",
  [HandCategory.Flush]: "フラッシュ",
  [HandCategory.FullHouse]: "フルハウス",
  [HandCategory.FourOfAKind]: "フォーカード",
  [HandCategory.StraightFlush]: "ストレートフラッシュ",
};

export function categoryLabel(c: HandCategory): string {
  return HAND_CATEGORY_NAME[c];
}

export function formatChips(n: number): string {
  return n.toLocaleString("en-US");
}

export function cardLabel(c: Card): string {
  return `${RANK_LABEL[c.rank] === "T" ? "10" : RANK_LABEL[c.rank]}${SUIT_SYMBOL[c.suit]}`;
}

export function cardsLabel(cards: readonly Card[]): string {
  return cards.map(cardLabel).join(" ");
}

export function streetLabel(s: Street): string {
  return STREET_LABEL[s];
}

const ACTION_LABEL: Record<LogEntry["type"], string> = {
  post_ante: "ANTE",
  post_sb: "SB",
  post_bb: "BB",
  fold: "FOLD",
  check: "CHECK",
  call: "CALL",
  bet: "BET",
  raise: "RAISE TO",
  all_in: "ALL-IN",
};

/** One log line, e.g. { who: "UTG", what: "RAISE TO", amount: "4,000" }. */
export function describeLogEntry(e: LogEntry, state: HandState, positions: Record<number, string>): { who: string; sub: string; what: string; amount: string } {
  const p = state.players.find((x) => x.seat === e.seat)!;
  const who = positions[e.seat] ?? p.name;
  const sub = p.name;
  const what = ACTION_LABEL[e.type];
  let amount = "";
  switch (e.type) {
    case "post_ante":
    case "post_sb":
    case "post_bb":
    case "call":
      amount = formatChips(e.chips);
      break;
    case "bet":
    case "raise":
      amount = formatChips(e.toAmount);
      break;
    case "all_in":
      amount = formatChips(e.toAmount);
      break;
    default:
      amount = "";
  }
  return { who, sub, what, amount };
}

export function formatSeconds(ms: number): string {
  return `${(ms / 1000).toFixed(2)} sec`;
}

export function formatSecondsShort(ms: number | null): string {
  return ms === null ? "–" : `${(ms / 1000).toFixed(1)} sec`;
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  const s = ms / 1000;
  return s < 60 ? `${s.toFixed(1)}s` : `${Math.floor(s / 60)}m${Math.round(s % 60)}s`;
}

export function formatPercent(x: number | null): string {
  return x === null ? "–" : `${Math.round(x * 100)}%`;
}
