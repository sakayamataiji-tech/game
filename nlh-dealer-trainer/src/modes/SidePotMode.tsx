"use client";
import { useCallback, useMemo, useState } from "react";
import { SidePotScenario } from "@/engine/scenarioGenerator";
import { positionLabels } from "@/engine/positions";
import { formatChips } from "@/lib/format";
import { applyPadKey, useDigitInput } from "@/lib/useDigitInput";
import { ActionLog } from "@/components/ActionLog";
import { PlayerTable } from "@/components/PlayerTable";
import { NumberPad, PadKey } from "@/components/NumberPad";
import type { ModeProps } from "@/components/Trainer";

interface PotRow {
  amount: string;
  eligible: number[];
}

const MAX_POTS = 6;

export function potLabel(i: number): string {
  return i === 0 ? "メインポット" : `サイドポット ${i}`;
}

/** Pure grading: user rows vs engine pots (order: main pot first). */
export function gradeSidePots(rows: readonly PotRow[], pots: readonly { amount: number; eligible: number[] }[]): { correct: boolean; rowResults: boolean[] } {
  const rowResults = rows.map((r, i) => {
    const p = pots[i];
    if (!p) return false;
    const amt = r.amount === "" ? NaN : Number(r.amount);
    const elig = r.eligible.slice().sort((a, b) => a - b);
    return amt === p.amount && elig.length === p.eligible.length && elig.every((s, j) => s === p.eligible[j]);
  });
  return { correct: rows.length === pots.length && rowResults.every(Boolean), rowResults };
}

export function SidePotMode({ scenario, revealed, onAnswer }: ModeProps<SidePotScenario>) {
  const { history, result } = scenario;
  const state = result.state;
  const positions = useMemo(() => positionLabels(state.players.map((p) => p.seat), history.buttonSeat), [state, history.buttonSeat]);
  const liveSeats = useMemo(() => state.players.filter((p) => !p.folded).map((p) => p.seat), [state]);
  const [rows, setRows] = useState<PotRow[]>([{ amount: "", eligible: [] }]);
  const [active, setActive] = useState(0);
  const [graded, setGraded] = useState<boolean[] | null>(null);

  const submit = useCallback(() => {
    if (revealed) return;
    const g = gradeSidePots(rows, scenario.answer.pots);
    setGraded(g.rowResults);
    const summary = `正解: ${scenario.answer.pots.map((p, i) => `${potLabel(i)} ${formatChips(p.amount)}`).join(" / ")}`;
    onAnswer({ correct: g.correct, summary });
  }, [onAnswer, revealed, rows, scenario]);

  const onKey = useCallback((k: PadKey) => {
    if (revealed) return;
    if (k === "enter") { submit(); return; }
    setRows((rs) => rs.map((r, i) => (i === active ? { ...r, amount: applyPadKey(r.amount, k) } : r)));
  }, [active, revealed, submit]);
  useDigitInput(onKey, !revealed);

  const toggleSeat = (row: number, seat: number) => {
    if (revealed) return;
    setActive(row);
    setRows((rs) => rs.map((r, i) => {
      if (i !== row) return r;
      const has = r.eligible.includes(seat);
      return { ...r, eligible: has ? r.eligible.filter((s) => s !== seat) : [...r.eligible, seat] };
    }));
  };
  const addRow = () => {
    if (revealed || rows.length >= MAX_POTS) return;
    setRows((rs) => [...rs, { amount: "", eligible: [] }]);
    setActive(rows.length);
  };
  const removeRow = () => {
    if (revealed || rows.length <= 1) return;
    setRows((rs) => rs.slice(0, -1));
    setActive((a) => Math.min(a, rows.length - 2));
  };

  const uncalled = scenario.answer.uncalled;

  return (
    <div className="mode-layout">
      <section className="panel table-panel">
        <div className="blinds-line">
          Blinds <strong>{formatChips(history.smallBlind)} / {formatChips(history.bigBlind)}</strong>・{state.players.length}人・アンテなし
        </div>
        <PlayerTable state={state} positions={positions} revealed={revealed} />
        <ActionLog state={state} positions={positions} board={scenario.board} showPot={revealed} />
        {revealed && (
          <div className="explanation">
            <table className="breakdown">
              <thead><tr><th>ポット</th><th className="num">金額</th><th>参加資格</th><th className="num">上限/人</th></tr></thead>
              <tbody>
                {scenario.answer.pots.map((p, i) => (
                  <tr key={i}>
                    <td>{potLabel(i)}</td>
                    <td className="num">{formatChips(p.amount)}</td>
                    <td>{p.eligible.map((s) => `Seat ${s}`).join(", ")}</td>
                    <td className="num">{formatChips(p.level)}</td>
                  </tr>
                ))}
                {uncalled && (
                  <tr className="row-uncalled"><td>未コール分の返却</td><td className="num">{formatChips(uncalled.amount)}</td><td>Seat {uncalled.seat} へ返却</td><td /></tr>
                )}
              </tbody>
            </table>
            <p className="muted small">各ポット＝全員（フォールド含む）の投入額をその上限で切り、前のポット分を引いた合計。参加資格は上限額以上を投入した未フォールドの席。</p>
          </div>
        )}
      </section>
      <section className="panel answer-panel">
        <p className="question">メインポットと各サイドポットの金額・参加資格者は？</p>
        <p className="muted small">未コール分は本人に返却。ポットは作られる順（メイン→サイド1→…）に入力してください。</p>
        <div className="pot-rows">
          {rows.map((r, i) => {
            const ok = graded ? graded[i] : null;
            const answerPot = scenario.answer.pots[i];
            return (
              <div key={i} className={`pot-row ${i === active && !revealed ? "pot-row-active" : ""} ${ok === true ? "pot-row-ok" : ok === false ? "pot-row-ng" : ""}`}>
                <div className="pot-row-head">
                  <span className="pot-row-label">{potLabel(i)}</span>
                  <button type="button" className={`amount-field amount-inline ${i === active && !revealed ? "amount-active" : ""}`} onClick={() => !revealed && setActive(i)} aria-label={`${potLabel(i)} の金額`}>
                    {r.amount === "" ? <span className="placeholder">0</span> : formatChips(Number(r.amount))}
                  </button>
                </div>
                <div className="seat-toggles" role="group" aria-label={`${potLabel(i)} の参加資格`}>
                  {liveSeats.map((seat) => (
                    <button key={seat} type="button" className={`seat-toggle ${r.eligible.includes(seat) ? "seat-toggle-on" : ""}`} disabled={revealed} onClick={() => toggleSeat(i, seat)}>
                      Seat {seat}<small>{positions[seat]}</small>
                    </button>
                  ))}
                </div>
                {revealed && (
                  <div className="pot-row-answer">
                    {answerPot
                      ? <>正解 {formatChips(answerPot.amount)}・{answerPot.eligible.map((s) => `Seat ${s}`).join(", ")}</>
                      : "このポットは存在しません"}
                  </div>
                )}
              </div>
            );
          })}
          {revealed && scenario.answer.pots.length > rows.length && (
            <div className="pot-row pot-row-ng">
              <div className="pot-row-answer">未入力のポットがあります: {scenario.answer.pots.slice(rows.length).map((p, j) => `${potLabel(rows.length + j)} ${formatChips(p.amount)}`).join(" / ")}</div>
            </div>
          )}
        </div>
        <div className="pot-row-actions">
          <button type="button" className="btn" onClick={addRow} disabled={revealed || rows.length >= MAX_POTS}>＋ サイドポットを追加</button>
          <button type="button" className="btn" onClick={removeRow} disabled={revealed || rows.length <= 1}>− 最後を削除</button>
        </div>
        <NumberPad onKey={onKey} disabled={revealed} />
      </section>
    </div>
  );
}
