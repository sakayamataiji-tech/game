import { ReactNode } from "react";
import { Card } from "@/engine/cards";
import { CardRow } from "./CardRow";
import { CardSize } from "./PlayingCard";
import { formatChips } from "@/lib/format";

export interface TableSeat {
  seat: number;
  name: string;
  position?: string;
  stack?: number;
  holeCards?: readonly Card[];
  folded?: boolean;
  allIn?: boolean;
  isButton?: boolean;
  /** After reveal: winner / eligible highlight. */
  winner?: boolean;
  /** After reveal: hand title under the cards. */
  caption?: ReactNode;
  /** After reveal: dim cards not in the best five. */
  bestFive?: readonly Card[] | null;
  /** Chips in front of the player (contribution) once revealed. */
  contribution?: number;
}

interface Props {
  seats: TableSeat[];
  board: readonly Card[];
  /** Total board slots to draw (5 for a full board, 0 to hide). */
  boardSlots?: number;
  /** Text under the board (e.g. blinds, or the pot once revealed). */
  center?: ReactNode;
  /** Card size for hole cards. */
  cardSize?: CardSize;
  boardSize?: CardSize;
  /** "single": one player facing the dealer (HAND READING), bigger cards. */
  layout?: "arc" | "single";
}

/**
 * The table as seen from the dealer's seat: players on the far arc, the board
 * in the middle, the dealer (you) at the bottom edge.
 */
export function TableView({ seats, board, boardSlots = 5, center, cardSize, boardSize, layout = "arc" }: Props) {
  const n = seats.length;
  const single = layout === "single";
  const holeSize: CardSize = cardSize ?? (single ? "lg" : n >= 5 ? "xs" : n >= 3 ? "sm" : "md");
  const bSize: CardSize = boardSize ?? (single ? "lg" : "md");
  return (
    <div className={`table ${n >= 5 ? "table-crowded" : ""} ${single ? "table-single" : ""}`} data-seats={n}>
      {/* crowded tables show only the hand title under the cards */}
      <div className="table-felt">
        <div className="table-center">
          {boardSlots > 0 && <CardRow cards={board} size={bSize} placeholders={boardSlots} />}
          {center && <div className="table-center-label">{center}</div>}
        </div>
        {seats.map((s, i) => {
          // Up to 4 seats: an arc on the far side of the table (9 o'clock → 3 o'clock).
          // 5+ seats: two staggered rows so neighbouring seats never overlap.
          let x: number, y: number;
          if (single) { x = 50; y = 30; }
          else if (n <= 4) {
            const theta = Math.PI * (0.9 + (1.2 * (i + 0.5)) / n);
            x = 50 + 42 * Math.cos(theta);
            y = 52 + 34 * Math.sin(theta);
          } else {
            x = 8 + (84 * i) / (n - 1);
            y = i % 2 === 1 ? 14 : 40;
          }
          const cls = ["seat", s.folded ? "seat-folded" : "", s.allIn ? "seat-allin" : "", s.winner ? "seat-winner" : ""].filter(Boolean).join(" ");
          return (
            <div key={s.seat} className={cls} style={{ left: `${x}%`, top: `${y}%` }}>
              <div className="seat-head">
                <span className="seat-name">{s.name}</span>
                {s.position && <span className="seat-pos">{s.position}</span>}
                {s.isButton && <span className="dealer-button" title="Dealer button">D</span>}
              </div>
              {s.holeCards && <CardRow cards={s.holeCards} size={holeSize} highlight={s.bestFive ?? null} />}
              {s.stack !== undefined && <div className="seat-stack">{formatChips(s.stack)}</div>}
              {s.contribution !== undefined && s.contribution > 0 && <div className="seat-chips">{formatChips(s.contribution)}</div>}
              {(s.folded || s.allIn) && <div className="seat-status">{s.folded ? "FOLD" : "ALL-IN"}</div>}
              {s.caption && <div className="seat-caption">{s.caption}</div>}
            </div>
          );
        })}
        <div className="dealer-spot">DEALER</div>
      </div>
    </div>
  );
}
