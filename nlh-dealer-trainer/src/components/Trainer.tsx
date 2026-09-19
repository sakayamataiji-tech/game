"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { generateScenario, Mode, Scenario } from "@/engine/scenarioGenerator";
import { randomSeed } from "@/engine/shuffle";
import { formatPercent, MODE_INFO } from "@/lib/format";
import { accuracy } from "@/lib/stats";
import { useStats } from "@/lib/useStats";
import { HandReadingMode } from "@/modes/HandReadingMode";
import { WinnerMode } from "@/modes/WinnerMode";
import { PotMode } from "@/modes/PotMode";
import { SidePotMode } from "@/modes/SidePotMode";

export interface Outcome {
  correct: boolean;
  /** Short line shown in the result banner, e.g. "正解: 1,300". */
  summary: string;
}

export interface ModeProps<S extends Scenario> {
  scenario: S;
  revealed: boolean;
  outcome: Outcome | null;
  onAnswer: (o: Outcome) => void;
}

interface Props {
  mode: Mode;
}

function seedFromUrl(): number | null {
  if (typeof window === "undefined") return null;
  const raw = new URLSearchParams(window.location.search).get("seed");
  if (raw === null || !/^\d+$/.test(raw)) return null;
  return Number(raw) >>> 0;
}

/**
 * Drives one training mode: generates a fresh random scenario per round,
 * times the answer, records stats and handles the "next" flow. The mode
 * components grade answers against the engine-derived scenario answer.
 */
export function Trainer({ mode }: Props) {
  const info = MODE_INFO[mode];
  const { stats, loaded, record } = useStats();
  const [round, setRound] = useState(0);
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [startedAt, setStartedAt] = useState(0);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [session, setSession] = useState({ attempts: 0, correct: 0, streak: 0 });

  // Scenarios are random, so they are generated on the client after mount
  // (the statically exported HTML has no scenario baked in).
  useEffect(() => {
    let s: Scenario | null = null;
    // `?seed=123` reproduces a specific problem for the first round (bug reports, drills).
    const urlSeed = round === 0 ? seedFromUrl() : null;
    for (let i = 0; i < 5 && !s; i++) {
      try { s = generateScenario(mode, urlSeed !== null && i === 0 ? urlSeed : randomSeed()); } catch { s = null; }
    }
    setScenario(s);
    setOutcome(null);
    setStartedAt(performance.now());
  }, [mode, round]);

  const onAnswer = useCallback((o: Outcome) => {
    if (!scenario || outcome) return;
    const timeMs = Math.round(performance.now() - startedAt);
    setOutcome(o);
    record(mode, { correct: o.correct, timeMs, seed: scenario.seed });
    setSession((s) => ({ attempts: s.attempts + 1, correct: s.correct + (o.correct ? 1 : 0), streak: o.correct ? s.streak + 1 : 0 }));
  }, [mode, outcome, record, scenario, startedAt]);

  const next = useCallback(() => setRound((r) => r + 1), []);

  // Enter / Space / N advances once the answer is shown.
  useEffect(() => {
    if (!outcome) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " " || e.key.toLowerCase() === "n") { e.preventDefault(); next(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [outcome, next]);

  const modeStats = stats.modes[mode];
  const revealed = outcome !== null;

  const body = useMemo(() => {
    if (!scenario) return <div className="loading">問題を生成中…</div>;
    switch (scenario.mode) {
      case "hand-reading": return <HandReadingMode key={scenario.seed} scenario={scenario} revealed={revealed} outcome={outcome} onAnswer={onAnswer} />;
      case "winner": return <WinnerMode key={scenario.seed} scenario={scenario} revealed={revealed} outcome={outcome} onAnswer={onAnswer} />;
      case "pot": return <PotMode key={scenario.seed} scenario={scenario} revealed={revealed} outcome={outcome} onAnswer={onAnswer} />;
      case "side-pot": return <SidePotMode key={scenario.seed} scenario={scenario} revealed={revealed} outcome={outcome} onAnswer={onAnswer} />;
    }
  }, [scenario, revealed, outcome, onAnswer]);

  return (
    <div className="trainer">
      <header className="trainer-header">
        <div className="trainer-title">
          <Link href="/" className="back-link" aria-label="ホームへ">←</Link>
          <div>
            <h1>{info.title}</h1>
            <p className="trainer-subtitle">{info.subtitle}</p>
          </div>
        </div>
        <div className="trainer-stats" aria-live="polite">
          <span title="このセッション">今回 {session.correct}/{session.attempts}</span>
          <span title="連続正解">連続 {session.streak}</span>
          <span title="通算正答率">通算 {loaded ? formatPercent(accuracy(modeStats)) : "…"}（{modeStats.attempts}問）</span>
        </div>
      </header>

      <div className="trainer-body">{body}</div>

      {outcome && (
        <div className={`result-banner ${outcome.correct ? "result-correct" : "result-wrong"}`} role="status">
          <div className="result-text">
            <strong>{outcome.correct ? "正解！" : "不正解"}</strong>
            <span>{outcome.summary}</span>
          </div>
          <button type="button" className="btn btn-primary btn-next" onClick={next} autoFocus>
            次の問題 <kbd>Enter</kbd>
          </button>
        </div>
      )}
      {!outcome && scenario && <p className="hint">{info.shortcut}<span className="seed">seed {scenario.seed}</span></p>}
    </div>
  );
}
