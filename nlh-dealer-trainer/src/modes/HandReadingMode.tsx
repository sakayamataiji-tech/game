"use client";
import { useCallback, useState } from "react";
import { HandReadingScenario } from "@/engine/scenarioGenerator";
import { HAND_CATEGORIES, HandCategory, HAND_CATEGORY_NAME } from "@/engine/handEvaluator";
import { CATEGORY_JA } from "@/lib/format";
import { CardRow } from "@/components/CardRow";
import { Choice, ChoiceGrid } from "@/components/ChoiceGrid";
import { TableView } from "@/components/TableView";
import type { ModeProps } from "@/components/Trainer";

const CHOICES: Choice[] = HAND_CATEGORIES.map((c, i) => ({
  key: String(c),
  label: HAND_CATEGORY_NAME[c],
  sub: CATEGORY_JA[c],
  hotkey: String(i + 1),
}));

export function HandReadingMode({ scenario, revealed, onAnswer }: ModeProps<HandReadingScenario>) {
  const [selected, setSelected] = useState<string | null>(null);
  const { hand } = scenario.answer;
  const answerKey = String(scenario.answer.category);
  const bestFive = hand.bestFive.slice().sort((a, b) => b.rank - a.rank);

  const select = useCallback((key: string) => {
    if (revealed) return;
    setSelected(key);
    const chosen = Number(key) as HandCategory;
    onAnswer({
      correct: chosen === scenario.answer.category,
      yourAnswer: HAND_CATEGORY_NAME[chosen],
      correctAnswer: `${hand.title} ${hand.ranksLabel}`,
      detail: (
        <div className="best-five">
          <small>Best 5</small>
          <CardRow cards={bestFive} size="sm" />
          <span className="muted">{hand.detail}{hand.kicker ? ` · ${hand.kicker}` : ""}</span>
        </div>
      ),
    });
  }, [onAnswer, revealed, scenario, hand, bestFive]);

  return (
    <div className="mode-layout">
      <section className="panel table-panel">
        <TableView
          seats={[{ seat: 1, name: "PLAYER", holeCards: scenario.holeCards, bestFive: revealed ? hand.bestFive : null, caption: revealed ? hand.description : undefined }]}
          board={scenario.board}
          layout="single"
          center={revealed ? <span className="table-answer">{hand.title} <em>{hand.ranksLabel}</em></span> : <span className="muted">BOARD</span>}
        />
        <p className="question">このプレイヤーの BEST HAND は？</p>
      </section>
      <section className="panel answer-panel">
        <ChoiceGrid choices={CHOICES} selected={selected} correct={revealed ? answerKey : null} disabled={revealed} onSelect={select} columns={3} />
      </section>
    </div>
  );
}
