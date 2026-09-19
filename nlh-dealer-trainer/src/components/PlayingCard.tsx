import { Card, RANK_LABEL, SUIT_SYMBOL } from "@/engine/cards";

export type CardSize = "sm" | "md" | "lg";

interface Props {
  card: Card;
  size?: CardSize;
  highlight?: boolean;
  dim?: boolean;
}

export function PlayingCard({ card, size = "md", highlight = false, dim = false }: Props) {
  const red = card.suit === "h" || card.suit === "d";
  const cls = ["card", `card-${size}`, red ? "card-red" : "card-black", highlight ? "card-highlight" : "", dim ? "card-dim" : ""]
    .filter(Boolean).join(" ");
  const label = `${RANK_LABEL[card.rank]}${SUIT_SYMBOL[card.suit]}`;
  return (
    <span className={cls} aria-label={label} role="img">
      <span className="card-rank">{RANK_LABEL[card.rank] === "T" ? "10" : RANK_LABEL[card.rank]}</span>
      <span className="card-suit">{SUIT_SYMBOL[card.suit]}</span>
    </span>
  );
}

export function CardBack({ size = "md" }: { size?: CardSize }) {
  return <span className={`card card-back card-${size}`} aria-label="伏せカード" role="img" />;
}
