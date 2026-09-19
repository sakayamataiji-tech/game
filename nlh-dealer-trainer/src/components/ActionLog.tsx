import { Fragment } from "react";
import { HandState, Street, STREETS } from "@/engine/betting";
import { Card } from "@/engine/cards";
import { describeLogEntry, formatChips, streetLabel } from "@/lib/format";
import { CardRow } from "./CardRow";

interface Props {
  state: HandState;
  positions: Record<number, string>;
  board: readonly Card[];
  /** Show the running pot after each action (only after the answer is revealed). */
  showPot: boolean;
}

function boardForStreet(board: readonly Card[], street: Street): Card[] {
  if (street === "preflop") return [];
  if (street === "flop") return board.slice(0, 3);
  if (street === "turn") return board.slice(0, 4);
  return board.slice(0, 5);
}

export function ActionLog({ state, positions, board, showPot }: Props) {
  const streets = STREETS.filter((s) => state.log.some((e) => e.street === s) || (s !== "preflop" && STREETS.indexOf(s) <= STREETS.indexOf(state.street)));
  return (
    <div className="action-log">
      {streets.map((street) => {
        const entries = state.log.filter((e) => e.street === street);
        const cards = boardForStreet(board, street);
        return (
          <Fragment key={street}>
            <div className="log-street">
              <span className="log-street-name">{streetLabel(street)}</span>
              {cards.length > 0 && <CardRow cards={cards} size="sm" />}
              {entries.length === 0 && <span className="log-noaction">アクションなし</span>}
            </div>
            {entries.map((e, i) => {
              const d = describeLogEntry(e, state, positions);
              return (
                <div key={`${street}-${i}`} className={`log-row log-${e.type}`}>
                  <span className="log-who">{d.who}</span>
                  <span className="log-what">{d.what}</span>
                  <span className="log-amount">{d.amount}</span>
                  {showPot && <span className="log-pot">pot {formatChips(e.potAfter)}</span>}
                </div>
              );
            })}
          </Fragment>
        );
      })}
    </div>
  );
}
