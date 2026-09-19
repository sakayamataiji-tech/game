import { HandState } from "@/engine/betting";
import { formatChips } from "@/lib/format";

interface Props {
  state: HandState;
  positions: Record<number, string>;
  /** Show final stacks / contributions (after reveal). */
  revealed: boolean;
}

/** Seats with starting stacks. Contributions only appear after the answer. */
export function PlayerTable({ state, positions, revealed }: Props) {
  return (
    <table className="player-table">
      <thead>
        <tr>
          <th>Seat</th>
          <th>Pos</th>
          <th className="num">Stack</th>
          {revealed && <th className="num">投入額</th>}
          <th>状態</th>
        </tr>
      </thead>
      <tbody>
        {state.players.map((p) => (
          <tr key={p.seat} className={p.folded ? "row-folded" : ""}>
            <td>{p.name}{p.seat === state.buttonSeat && <span className="dealer-button" title="Dealer button">D</span>}</td>
            <td>{positions[p.seat]}</td>
            <td className="num">{formatChips(p.startingStack)}</td>
            {revealed && <td className="num">{formatChips(p.totalContribution)}</td>}
            <td>{p.folded ? "フォールド" : p.allIn ? "オールイン" : ""}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
