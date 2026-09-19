import { Card, sameCard } from "@/engine/cards";
import { CardBack, CardSize, PlayingCard } from "./PlayingCard";

interface Props {
  cards: readonly Card[];
  size?: CardSize;
  /** Cards to highlight (e.g. the best five). Others are dimmed when set. */
  highlight?: readonly Card[] | null;
  /** Render placeholders up to this many cards (e.g. 5 for an unfinished board). */
  placeholders?: number;
  label?: string;
}

export function CardRow({ cards, size = "md", highlight = null, placeholders = 0, label }: Props) {
  const missing = Math.max(0, placeholders - cards.length);
  return (
    <div className="card-row" aria-label={label}>
      {label && <span className="card-row-label">{label}</span>}
      {cards.map((c, i) => {
        const hl = highlight ? highlight.some((h) => sameCard(h, c)) : false;
        return <PlayingCard key={i} card={c} size={size} highlight={hl} dim={!!highlight && !hl} />;
      })}
      {Array.from({ length: missing }, (_, i) => <CardBack key={`b${i}`} size={size} />)}
    </div>
  );
}
