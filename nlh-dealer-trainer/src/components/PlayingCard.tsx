import { Card, RANK_LABEL, SUIT_SYMBOL } from "@/engine/cards";

export type CardSize = "xs" | "sm" | "md" | "lg" | "xl";

interface Props {
  card: Card;
  size?: CardSize;
  highlight?: boolean;
  dim?: boolean;
}

/** A playing card: big rank, big suit, red hearts/diamonds, black spades/clubs. */
export function PlayingCard({ card, size = "md", highlight = false, dim = false }: Props) {
  const red = card.suit === "h" || card.suit === "d";
  const cls = ["card", `card-${size}`, red ? "card-red" : "card-black", highlight ? "card-highlight" : "", dim ? "card-dim" : ""]
    .filter(Boolean).join(" ");
  const rank = RANK_LABEL[card.rank] === "T" ? "10" : RANK_LABEL[card.rank];
  const label = `${rank}${SUIT_SYMBOL[card.suit]}`;
  return (
    <span className={cls} aria-label={label} role="img">
      <span className="card-corner"><span className="card-rank">{rank}</span><span className="card-corner-suit">{SUIT_SYMBOL[card.suit]}</span></span>
      <span className="card-suit">{SUIT_SYMBOL[card.suit]}</span>
    </span>
  );
}

export function CardBack({ size = "md" }: { size?: CardSize }) {
  return <span className={`card card-back card-${size}`} aria-label="伏せカード" role="img" />;
}
