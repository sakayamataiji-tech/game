"use client";
import { useCallback, useMemo, useState } from "react";
import { Check, X } from "lucide-react";
import { SidePotScenario } from "@/engine/scenarioGenerator";
import { positionLabels } from "@/engine/positions";
import { formatChips } from "@/lib/format";
import { applyPadKey, useDigitInput } from "@/lib/useDigitInput";
import { ActionLog } from "@/components/ActionLog";
import { NumberPad, PadKey } from "@/components/NumberPad";
import { TableView, TableSeat } from "@/components/TableView";
import type { ModeProps } from "@/components/Trainer";

export function potLabel(i: number): string {
  return i === 0 ? "MAIN POT" : `SIDE POT ${i}`;
}

interface StepResult { given: number; correct: boolean }

/**
 * SIDE POT: the pots are asked one at a time (MAIN POT → SIDE POT 1 → …),
 * each graded immediately. The question counts as correct only when every
 * pot was right. Eligible players are shown with each answer.
 */
export function SidePotMode({ scenario, revealed, onAnswer }: ModeProps<SidePotScenario>) {
  const { history, result } = scenario;
  const state = result.state;
  const pots = scenario.answer.pots;
  const positions = useMemo(() => positionLabels(state.players.map((p) => p.seat), history.buttonSeat), [state, history.buttonSeat]);
  const [value, setValue] = useState("");
  const [steps, setSteps] = useState<StepResult[]>([]);
  const step = steps.length; // index of the pot being asked
  const done = step >= pots.length;
  const uncalled = scenario.answer.uncalled;
  const seatLabel = (seat: number) => `${positions[seat]} (P${seat})`;

  const finish = useCallback((all: StepResult[]) => {
    const correct = all.every((s) => s.correct);
    onAnswer({
      correct,
      yourAnswer: all.map((s, i) => `${potLabel(i)} ${formatChips(s.given)}`).join(" / "),
      correctAnswer: pots.map((p, i) => `${potLabel(i)} ${formatChips(p.amount)}`).join(" / "),
      detail: (
        <table className="breakdown">
          <tbody>
            {pots.map((p, i) => (
              <tr key={i} className={all[i]?.correct ? "row-ok" : "row-ng"}>
                <td>{potLabel(i)}</td>
                <td className="num">{formatChips(p.amount)}</td>
                <td><small>Eligible</small> {p.eligible.map(seatLabel).join(" / ")}</td>
              </tr>
            ))}
            {uncalled && <tr className="row-uncalled"><td>Uncalled</td><td className="num">{formatChips(uncalled.amount)}</td><td>→ {seatLabel(uncalled.seat)} に返却</td></tr>}
          </tbody>
        </table>
      ),
    });
  }, [onAnswer, pots, uncalled]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = useCallback((v: string) => {
    if (revealed || done || v === "") return;
    const given = Number(v);
    const next = [...steps, { given, correct: given === pots[step].amount }];
    setSteps(next);
    setValue("");
    if (next.length >= pots.length) finish(next);
  }, [revealed, done, steps, pots, step, finish]);

  const onKey = useCallback((k: PadKey) => {
    if (revealed || done) return;
    if (k === "enter") { submit(value); return; }
    setValue((v) => applyPadKey(v, k));
  }, [revealed, done, submit, value]);
  useDigitInput(onKey, !revealed && !done);

  const seats: TableSeat[] = state.players.map((p) => ({
    seat: p.seat,
    name: p.name,
    position: positions[p.seat],
    stack: p.startingStack,
    isButton: p.seat === history.buttonSeat,
    folded: p.folded,
    allIn: p.allIn,
    contribution: p.totalContribution,
  }));

  return (
    <div className="mode-layout">
      <section className="panel table-panel">
        <TableView
          seats={seats}
          board={scenario.board}
          boardSlots={scenario.board.length === 0 ? 0 : 5}
          boardSize="md"
          center={revealed
            ? <span className="table-answer">{pots.map((p, i) => `${potLabel(i)} ${formatChips(p.amount)}`).join(" · ")}</span>
            : <span className="blinds">SB {formatChips(history.smallBlind)} / BB {formatChips(history.bigBlind)}</span>}
        />
        <ActionLog state={state} positions={positions} board={scenario.board} showPot={revealed} />
        <p className="muted small">各席の下の数字は投入額（Contribution）。フォールドした席の投入分もポットに残るが獲得資格はない。</p>
      </section>
      <section className="panel answer-panel">
        <div className="pot-steps">
          {pots.map((p, i) => {
            const r = steps[i];
            const active = i === step && !revealed;
            return (
              <div key={i} className={`pot-step ${active ? "pot-step-active" : ""} ${r ? (r.correct ? "pot-step-ok" : "pot-step-ng") : ""} ${i > step ? "pot-step-future" : ""}`}>
                <div className="pot-step-head">
                  <span className="pot-step-label">{potLabel(i)}</span>
                  {r && (r.correct ? <Check size={18} /> : <X size={18} />)}
                  {r && <span className="pot-step-given">{formatChips(r.given)}</span>}
                </div>
                {r && (
                  <div className="pot-step-answer">
                    {!r.correct && <span><small>Correct</small> {formatChips(p.amount)}</span>}
                    <span><small>Eligible</small> {p.eligible.map(seatLabel).join(" / ")}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {!done && (
          <>
            <p className="question">{potLabel(step)} はいくら？</p>
            <div className="amount-field amount-active" role="textbox" aria-label={potLabel(step)}>
              {value === "" ? <span className="placeholder">0</span> : formatChips(Number(value))}
            </div>
            <NumberPad onKey={onKey} disabled={revealed || done} enterLabel="ENTER" />
          </>
        )}
        {done && uncalled && <p className="muted small">未コール分 {formatChips(uncalled.amount)} は {seatLabel(uncalled.seat)} に返却。</p>}
      </section>
    </div>
  );
}
