"use client";
import { useCallback, useMemo, useState } from "react";
import { WinnerScenario } from "@/engine/scenarioGenerator";
import { positionLabels } from "@/engine/positions";
import { CardRow } from "@/components/CardRow";
import { Choice, ChoiceGrid } from "@/components/ChoiceGrid";
import type { ModeProps } from "@/components/Trainer";

const SPLIT_KEY = "split";

export function WinnerMode({ scenario, revealed, onAnswer }: ModeProps<WinnerScenario>) {
  const [selected, setSelected] = useState<string | null>(null);
  const positions = useMemo(() => positionLabels(scenario.players.map((p) => p.seat), scenario.buttonSeat), [scenario]);
  const answerKey = scenario.answer.split ? SPLIT_KEY : String(scenario.answer.winners[0]);

  const choices: Choice[] = useMemo(() => [
    ...scenario.players.map((p) => ({ key: String(p.seat), label: p.name, sub: positions[p.seat], hotkey: String(p.seat) })),
    { key: SPLIT_KEY, label: "SPLIT", sub: "全員で分け合う", hotkey: "s" },
  ], [scenario, positions]);

  const select = useCallback((key: string) => {
    if (revealed) return;
    setSelected(key);
    const correct = key === answerKey;
    const winnerText = scenario.answer.split
      ? `SPLIT（${scenario.answer.winners.map((s) => `Seat ${s}`).join(", ")}）`
      : `Seat ${scenario.answer.winners[0]} の勝ち`;
    onAnswer({ correct, summary: `正解: ${winnerText}` });
  }, [answerKey, onAnswer, revealed, scenario]);

  return (
    <div className="mode-layout">
      <section className="panel table-panel">
        <div className="board-area">
          <CardRow label="Board" cards={scenario.board} size="lg" />
        </div>
        <div className="seats">
          {scenario.players.map((p) => {
            const hand = scenario.answer.hands.find((h) => h.seat === p.seat)!.hand;
            const isWinner = scenario.answer.winners.includes(p.seat);
            return (
              <div key={p.seat} className={`seat ${revealed && isWinner ? "seat-winner" : ""}`}>
                <div className="seat-head">
                  <span className="seat-name">{p.name}</span>
                  <span className="seat-pos">{positions[p.seat]}</span>
                  {p.seat === scenario.buttonSeat && <span className="dealer-button">D</span>}
                </div>
                <CardRow cards={p.holeCards} size="md" highlight={revealed ? hand.bestFive : null} />
                {revealed && (
                  <div className="seat-hand">
                    <span>{hand.description}</span>
                    <CardRow cards={hand.bestFive.slice().sort((a, b) => b.rank - a.rank)} size="sm" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <p className="question">ショウダウン。勝者は？（全員同じ強さなら SPLIT）</p>
        {revealed && (
          <div className="explanation">
            <p className="muted">各席の下に最強5枚を表示。同じ役はキッカーまで比較し、スートに優劣はありません。</p>
          </div>
        )}
      </section>
      <section className="panel answer-panel">
        <ChoiceGrid choices={choices} selected={selected} correct={revealed ? answerKey : null} disabled={revealed} onSelect={select} columns={2} />
      </section>
    </div>
  );
}
