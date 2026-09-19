import { LogEntry, HandState, Street, STREET_LABEL } from "@/engine/betting";
import { Card, RANK_LABEL, SUIT_SYMBOL } from "@/engine/cards";
import { HandCategory, HAND_CATEGORY_NAME } from "@/engine/handEvaluator";
import type { Mode } from "@/engine/scenarioGenerator";

export const MODE_INFO: Record<Mode, { title: string; subtitle: string; description: string; shortcut: string }> = {
  "hand-reading": {
    title: "HAND READING",
    subtitle: "役の読み取り",
    description: "ボード5枚とホールカード2枚から、最強の5枚で作れる役を答えます。",
    shortcut: "1〜9キーで選択",
  },
  winner: {
    title: "WINNER",
    subtitle: "勝者判定",
    description: "ショウダウンした全プレイヤーのハンドを比較し、勝者（または全員スプリット）を答えます。",
    shortcut: "1〜4キーで席、Sでスプリット",
  },
  pot: {
    title: "POT",
    subtitle: "ポット計算",
    description: "ブラインドから始まるアクション履歴を追い、現在のポット総額を答えます。レイズは「レイズ to（そのストリートの合計額）」表記です。",
    shortcut: "数字キーで入力、Enterで回答",
  },
  "side-pot": {
    title: "SIDE POT",
    subtitle: "サイドポット計算",
    description: "オールインを含むアクション履歴から、メインポットと各サイドポットの金額および参加資格者を答えます。",
    shortcut: "数字キーで入力、Enterで回答",
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
  return `${HAND_CATEGORY_NAME[c]} / ${CATEGORY_JA[c]}`;
}

export function formatChips(n: number): string {
  return n.toLocaleString("en-US");
}

export function cardLabel(c: Card): string {
  return `${RANK_LABEL[c.rank]}${SUIT_SYMBOL[c.suit]}`;
}

export function streetLabel(s: Street): string {
  return STREET_LABEL[s];
}

const ACTION_JA: Record<LogEntry["type"], string> = {
  post_sb: "SB",
  post_bb: "BB",
  fold: "フォールド",
  check: "チェック",
  call: "コール",
  bet: "ベット",
  raise: "レイズ to",
  all_in: "オールイン",
};

/** One log line, e.g. "Seat 3 (BTN)  レイズ to 275". */
export function describeLogEntry(e: LogEntry, state: HandState, positions: Record<number, string>): { who: string; what: string; amount: string } {
  const p = state.players.find((x) => x.seat === e.seat)!;
  const who = `${p.name} (${positions[e.seat] ?? ""})`;
  const verb = ACTION_JA[e.type];
  let amount = "";
  switch (e.type) {
    case "post_sb":
    case "post_bb":
      amount = formatChips(e.chips);
      break;
    case "call":
      amount = formatChips(e.chips);
      break;
    case "bet":
    case "raise":
      amount = formatChips(e.toAmount);
      break;
    case "all_in":
      amount = `${formatChips(e.chips)}（合計 ${formatChips(e.toAmount)}）`;
      break;
    default:
      amount = "";
  }
  return { who, what: verb, amount };
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  const s = ms / 1000;
  return s < 60 ? `${s.toFixed(1)}s` : `${Math.floor(s / 60)}m${Math.round(s % 60)}s`;
}

export function formatPercent(x: number | null): string {
  return x === null ? "–" : `${Math.round(x * 100)}%`;
}
