"use client";
import { useCallback, useMemo, useState } from "react";
import { WinnerScenario } from "@/engine/scenarioGenerator";
import { positionLabels } from "@/engine/positions";
import { CardRow } from "@/components/CardRow";
import { Choice, ChoiceGrid } from "@/components/ChoiceGrid";
import { TableView, TableSeat } from "@/components/TableView";
import type { ModeProps } from "@/components/Trainer";

const SPLIT_KEY = "split";

export function WinnerMode({ scenario, revealed, onAnswer }: ModeProps<WinnerScenario>) {
  const [selected, setSelected] = useState<string | null>(null);
  const positions = useMemo(() => positionLabels(scenario.players.map((p) => p.seat), scenario.buttonSeat), [scenario]);
  const answerKey = scenario.answer.split ? SPLIT_KEY : String(scenario.answer.winners[0]);
  const winnerHand = scenario.answer.hands.find((h) => h.seat === scenario.answer.winners[0])!.hand;

  const choices: Choice[] = useMemo(() => [
    ...scenario.players.map((p) => ({ key: String(p.seat), label: `PLAYER ${p.seat}`, sub: positions[p.seat], hotkey: String(p.seat) })),
    { key: SPLIT_KEY, label: "SPLIT", sub: "全員同じ強さ", hotkey: "s" },
  ], [scenario, positions]);

  const select = useCallback((key: string) => {
    if (revealed) return;
    setSelected(key);
    const correct = key === answerKey;
    const bestFive = winnerHand.bestFive.slice().sort((a, b) => b.rank - a.rank);
    onAnswer({
      correct,
      yourAnswer: key === SPLIT_KEY ? "SPLIT" : `PLAYER ${key}`,
      correctAnswer: scenario.answer.split
        ? `SPLIT — ${scenario.answer.winners.map((s) => `PLAYER ${s}`).join(" / ")}`
        : `WINNER PLAYER ${scenario.answer.winners[0]}`,
      detail: (
        <div className="best-five">
          <span><strong>{winnerHand.title}</strong> · {winnerHand.detail}{winnerHand.kicker ? ` · ${winnerHand.kicker}` : ""}</span>
          <small>Best 5</small>
          <CardRow cards={bestFive} size="sm" />
        </div>
      ),
    });
  }, [answerKey, onAnswer, revealed, scenario, winnerHand]);

  const seats: TableSeat[] = scenario.players.map((p) => {
    const hand = scenario.answer.hands.find((h) => h.seat === p.seat)!.hand;
    return {
      seat: p.seat,
      name: `PLAYER ${p.seat}`,
      position: positions[p.seat],
      isButton: p.seat === scenario.buttonSeat,
      holeCards: p.holeCards,
      bestFive: revealed ? hand.bestFive : null,
      winner: revealed && scenario.answer.winners.includes(p.seat),
      caption: revealed ? <><b>{hand.title}</b><span>{hand.detail}</span></> : undefined,
    };
  });

  return (
    <div className="mode-layout">
      <section className="panel table-panel">
        <TableView seats={seats} board={scenario.board} center={revealed ? <span className="table-answer">{scenario.answer.split ? "SPLIT POT" : `WINNER · PLAYER ${scenario.answer.winners[0]}`}</span> : <span className="muted">SHOWDOWN</span>} />
        <p className="question">WINNER は？</p>
      </section>
      <section className="panel answer-panel">
        <ChoiceGrid choices={choices} selected={selected} correct={revealed ? answerKey : null} disabled={revealed} onSelect={select} columns={2} />
      </section>
    </div>
  );
}
