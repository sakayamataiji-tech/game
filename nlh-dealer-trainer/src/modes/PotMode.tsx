"use client";
import { useCallback, useMemo, useState } from "react";
import { PotScenario } from "@/engine/scenarioGenerator";
import { positionLabels } from "@/engine/positions";
import { formatChips, streetLabel } from "@/lib/format";
import { applyPadKey, useDigitInput } from "@/lib/useDigitInput";
import { ActionLog } from "@/components/ActionLog";
import { NumberPad, PadKey } from "@/components/NumberPad";
import { TableView, TableSeat } from "@/components/TableView";
import type { ModeProps } from "@/components/Trainer";

export function PotMode({ scenario, revealed, onAnswer }: ModeProps<PotScenario>) {
  const [value, setValue] = useState("");
  const { history, result } = scenario;
  const state = result.state;
  const positions = useMemo(() => positionLabels(state.players.map((p) => p.seat), history.buttonSeat), [state, history.buttonSeat]);
  const uncalled = result.breakdown.uncalled;

  const submit = useCallback((v: string) => {
    if (revealed || v === "") return;
    const n = Number(v);
    onAnswer({
      correct: n === scenario.answer.pot,
      yourAnswer: formatChips(n),
      correctAnswer: `POT ${formatChips(scenario.answer.pot)}`,
      detail: (
        <table className="breakdown">
          <tbody>
            {result.contributions.map((c) => (
              <tr key={c.seat} className={c.folded ? "row-folded" : ""}>
                <td>{positions[c.seat]}<small> {state.players.find((p) => p.seat === c.seat)!.name}</small></td>
                <td className="num">{formatChips(c.amount)}</td>
              </tr>
            ))}
            {uncalled && <tr className="row-uncalled"><td>Uncalled → {positions[uncalled.seat]}</td><td className="num">−{formatChips(uncalled.amount)}</td></tr>}
            <tr className="row-total"><td>TOTAL</td><td className="num">{formatChips(result.pot)}</td></tr>
          </tbody>
        </table>
      ),
    });
  }, [onAnswer, revealed, scenario, result, positions, state, uncalled]);

  const onKey = useCallback((k: PadKey) => {
    if (revealed) return;
    if (k === "enter") { submit(value); return; }
    setValue((v) => applyPadKey(v, k));
  }, [revealed, submit, value]);
  useDigitInput(onKey, !revealed);

  const seats: TableSeat[] = state.players.map((p) => ({
    seat: p.seat,
    name: p.name,
    position: positions[p.seat],
    stack: p.startingStack,
    isButton: p.seat === history.buttonSeat,
    folded: p.folded,
    allIn: p.allIn,
    contribution: revealed ? p.totalContribution : undefined,
  }));

  const question = result.handOver ? "ハンド終了。勝者に渡す POT は？" : `${streetLabel(state.street).toUpperCase()} 終了時点の POT は？`;

  return (
    <div className="mode-layout">
      <section className="panel table-panel">
        <TableView
          seats={seats}
          board={scenario.board}
          boardSlots={scenario.board.length === 0 ? 0 : 5}
          boardSize="md"
          center={revealed
            ? <span className="table-answer">POT {formatChips(result.pot)}</span>
            : <span className="blinds">SB {formatChips(history.smallBlind)} / BB {formatChips(history.bigBlind)}{history.ante ? ` / ANTE ${formatChips(history.ante)}` : ""}</span>}
        />
        <ActionLog state={state} positions={positions} board={scenario.board} showPot={revealed} />
        {revealed && (
          <table className="breakdown streets">
            <thead><tr><th>Street</th><th className="num">+</th><th className="num">Pot</th></tr></thead>
            <tbody>
              {result.streetPots.map((s) => (
                <tr key={s.street}><td>{streetLabel(s.street)}</td><td className="num">+{formatChips(s.added)}</td><td className="num">{formatChips(s.potAfter)}</td></tr>
              ))}
              {uncalled && <tr className="row-uncalled"><td>Uncalled bet returned ({positions[uncalled.seat]})</td><td className="num">−{formatChips(uncalled.amount)}</td><td className="num">{formatChips(result.pot)}</td></tr>}
            </tbody>
          </table>
        )}
      </section>
      <section className="panel answer-panel">
        <p className="question">{question}</p>
        <p className="muted small">未コールのベット／レイズ分は本人に返却した後の額。</p>
        <div className={`amount-field ${revealed ? "amount-revealed" : "amount-active"}`} role="textbox" aria-label="POT" aria-readonly={revealed}>
          {value === "" ? <span className="placeholder">0</span> : formatChips(Number(value))}
        </div>
        <NumberPad onKey={onKey} disabled={revealed} enterLabel="ENTER" />
      </section>
    </div>
  );
}
