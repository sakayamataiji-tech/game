"use client";
import { useCallback, useMemo, useState } from "react";
import { PotScenario } from "@/engine/scenarioGenerator";
import { positionLabels } from "@/engine/positions";
import { formatChips, streetLabel } from "@/lib/format";
import { applyPadKey, useDigitInput } from "@/lib/useDigitInput";
import { ActionLog } from "@/components/ActionLog";
import { PlayerTable } from "@/components/PlayerTable";
import { NumberPad, PadKey } from "@/components/NumberPad";
import type { ModeProps } from "@/components/Trainer";

export function PotMode({ scenario, revealed, onAnswer }: ModeProps<PotScenario>) {
  const [value, setValue] = useState("");
  const { history, result } = scenario;
  const state = result.state;
  const positions = useMemo(() => positionLabels(state.players.map((p) => p.seat), history.buttonSeat), [state, history.buttonSeat]);

  const submit = useCallback((v: string) => {
    if (revealed || v === "") return;
    const n = Number(v);
    onAnswer({ correct: n === scenario.answer.pot, summary: `正解: ${formatChips(scenario.answer.pot)}` });
  }, [onAnswer, revealed, scenario]);

  const onKey = useCallback((k: PadKey) => {
    if (revealed) return;
    if (k === "enter") { submit(value); return; }
    setValue((v) => applyPadKey(v, k));
  }, [revealed, submit, value]);
  useDigitInput(onKey, !revealed);

  const uncalled = result.breakdown.uncalled;

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
              <thead><tr><th>Street</th><th className="num">追加</th><th className="num">累計</th></tr></thead>
              <tbody>
                {result.streetPots.map((s) => (
                  <tr key={s.street}><td>{streetLabel(s.street)}</td><td className="num">+{formatChips(s.added)}</td><td className="num">{formatChips(s.potAfter)}</td></tr>
                ))}
                {uncalled && (
                  <tr className="row-uncalled"><td>未コール分の返却（Seat {uncalled.seat}）</td><td className="num">−{formatChips(uncalled.amount)}</td><td className="num">{formatChips(result.pot)}</td></tr>
                )}
              </tbody>
            </table>
            <p>
              ポット <strong>{formatChips(result.pot)}</strong>
              {result.handOver && "（残り1人のため、このポットをそのプレイヤーに渡します）"}
            </p>
          </div>
        )}
      </section>
      <section className="panel answer-panel">
        <p className="question">{result.handOver ? "ハンド終了。勝者に渡すポット総額は？" : `${streetLabel(state.street)} のアクション完了時点のポット総額は？`}</p>
        <p className="muted small">未コールのベット／レイズ分は本人に返却した後の額を答えてください。</p>
        <div className={`amount-field ${revealed ? "amount-revealed" : "amount-active"}`} role="textbox" aria-label="ポット額" aria-readonly={revealed}>
          {value === "" ? <span className="placeholder">0</span> : formatChips(Number(value))}
        </div>
        <NumberPad onKey={onKey} disabled={revealed} />
      </section>
    </div>
  );
}
