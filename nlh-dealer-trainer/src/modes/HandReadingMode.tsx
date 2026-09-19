"use client";
import { useCallback, useState } from "react";
import { HandReadingScenario } from "@/engine/scenarioGenerator";
import { HAND_CATEGORIES, HandCategory, HAND_CATEGORY_NAME } from "@/engine/handEvaluator";
import { CATEGORY_JA, categoryLabel } from "@/lib/format";
import { CardRow } from "@/components/CardRow";
import { Choice, ChoiceGrid } from "@/components/ChoiceGrid";
import type { ModeProps } from "@/components/Trainer";

const CHOICES: Choice[] = HAND_CATEGORIES.map((c, i) => ({
  key: String(c),
  label: HAND_CATEGORY_NAME[c],
  sub: CATEGORY_JA[c],
  hotkey: String(i + 1),
}));

export function HandReadingMode({ scenario, revealed, onAnswer }: ModeProps<HandReadingScenario>) {
  const [selected, setSelected] = useState<string | null>(null);
  const answerKey = String(scenario.answer.category);

  const select = useCallback((key: string) => {
    if (revealed) return;
    setSelected(key);
    const chosen = Number(key) as HandCategory;
    onAnswer({
      correct: chosen === scenario.answer.category,
      summary: `正解: ${scenario.answer.hand.description}`,
    });
  }, [onAnswer, revealed, scenario]);

  return (
    <div className="mode-layout">
      <section className="panel table-panel">
        <div className="board-area">
          <CardRow label="Board" cards={scenario.board} size="lg" highlight={revealed ? scenario.answer.hand.bestFive : null} />
          <CardRow label="Hole" cards={scenario.holeCards} size="lg" highlight={revealed ? scenario.answer.hand.bestFive : null} />
        </div>
        <p className="question">このプレイヤーの役（最強の5枚）は？</p>
        {revealed && (
          <div className="explanation">
            <p><strong>{categoryLabel(scenario.answer.category)}</strong></p>
            <p>{scenario.answer.hand.description}{scenario.answer.hand.isRoyalFlush ? "（ロイヤルフラッシュ）" : ""}</p>
            <p className="muted">ハイライトの5枚が役を構成するカードです。</p>
          </div>
        )}
      </section>
      <section className="panel answer-panel">
        <ChoiceGrid choices={CHOICES} selected={selected} correct={revealed ? answerKey : null} disabled={revealed} onSelect={select} columns={3} />
      </section>
    </div>
  );
}
