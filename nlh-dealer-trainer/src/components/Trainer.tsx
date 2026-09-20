"use client";
import Link from "next/link";
import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Check, Play, Timer, X, Zap } from "lucide-react";
import { generateScenario, Mode, pickQuickMode, Scenario } from "@/engine/scenarioGenerator";
import { randomSeed } from "@/engine/shuffle";
import { Level, LEVELS, scoreAnswer, ScoreBreakdown, speedFeedback, SpeedFeedback } from "@/engine/rating";
import { formatPercent, formatSeconds, formatSecondsShort, MODE_INFO } from "@/lib/format";
import { quickModeWeights, weakSkills } from "@/lib/stats";
import { useStats } from "@/lib/useStats";
import { comboLabel } from "@/lib/game";
import { vibrate } from "@/lib/settings";
import {
  isSessionOver, LevelSetting, nextAutoLevel, SESSION_LENGTHS, SessionAttempt, SessionConfig, SessionLength, summarizeSession, TrainMode,
} from "@/lib/session";
import { HandReadingMode } from "@/modes/HandReadingMode";
import { WinnerMode } from "@/modes/WinnerMode";
import { PotMode } from "@/modes/PotMode";
import { SidePotMode } from "@/modes/SidePotMode";

export interface Outcome {
  correct: boolean;
  /** What the trainee answered, e.g. "One Pair" / "14,500". */
  yourAnswer: string;
  /** The engine's answer, e.g. "STRAIGHT A-K-Q-J-T". */
  correctAnswer: string;
  /** Extra explanation (best five, calculation process). */
  detail?: ReactNode;
}

export interface ModeProps<S extends Scenario> {
  scenario: S;
  revealed: boolean;
  onAnswer: (o: Outcome) => void;
}

interface Answered extends Outcome {
  timeMs: number;
  speed: SpeedFeedback;
  score: ScoreBreakdown;
  streak: number;
}

type Phase = "start" | "play" | "result";

function seedFromUrl(): number | null {
  if (typeof window === "undefined") return null;
  const raw = new URLSearchParams(window.location.search).get("seed");
  if (raw === null || !/^\d+$/.test(raw)) return null;
  return Number(raw) >>> 0;
}

function levelFromUrl(): Level | null {
  if (typeof window === "undefined") return null;
  const raw = Number(new URLSearchParams(window.location.search).get("level"));
  return (LEVELS as readonly number[]).includes(raw) ? (raw as Level) : null;
}

/**
 * Drives a training session: START → questions (fresh random scenario each,
 * timed, scored, recorded to stats) → SESSION RESULT. Mode components grade
 * answers against the engine-derived scenario answer.
 */
export function Trainer({ train }: { train: TrainMode }) {
  const info = MODE_INFO[train];
  const { stats, loaded, record } = useStats();
  const [phase, setPhase] = useState<Phase>("start");
  const [config, setConfig] = useState<SessionConfig>({ train, length: 10, level: "auto" });
  const [attempts, setAttempts] = useState<SessionAttempt[]>([]);
  const [round, setRound] = useState(0);
  const [level, setLevel] = useState<Level>(1);
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [startedAt, setStartedAt] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [answered, setAnswered] = useState<Answered | null>(null);
  const statsRef = useRef(stats);
  statsRef.current = stats;

  const profileLevel = useCallback((cfg: SessionConfig): Level => {
    if (cfg.level !== "auto") return cfg.level;
    const s = statsRef.current;
    if (cfg.train === "quick") {
      const ls = Object.values(s.profile.levels);
      return Math.max(1, Math.round(ls.reduce((a, b) => a + b, 0) / ls.length)) as Level;
    }
    return s.profile.levels[cfg.train];
  }, []);

  const start = useCallback((cfg: SessionConfig) => {
    setConfig(cfg);
    setAttempts([]);
    setLevel(levelFromUrl() ?? profileLevel(cfg));
    setRound(0);
    setAnswered(null);
    setPhase("play");
  }, [profileLevel]);

  // A new random scenario for every round. Generated on the client only: the
  // statically exported HTML never contains a scenario.
  useEffect(() => {
    if (phase !== "play") return;
    const s = statsRef.current;
    const urlSeed = round === 0 ? seedFromUrl() : null;
    const weak = weakSkills(s);
    let sc: Scenario | null = null;
    for (let i = 0; i < 5 && !sc; i++) {
      const seed = urlSeed !== null && i === 0 ? urlSeed : randomSeed();
      const mode: Mode = config.train === "quick" ? pickQuickMode(seed, quickModeWeights(s)) : config.train;
      // An explicit ?seed= must reproduce exactly, so the weak-skill bias is off for it.
      try { sc = generateScenario(mode, { level, seed, weakSkills: urlSeed !== null ? [] : weak }); } catch { sc = null; }
    }
    setScenario(sc);
    setAnswered(null);
    setStartedAt(performance.now());
    setElapsed(0);
  }, [phase, round, config.train, level]);

  // Live timer (100ms) while a question is open.
  useEffect(() => {
    if (phase !== "play" || answered || !scenario) return;
    const id = window.setInterval(() => setElapsed(performance.now() - startedAt), 100);
    return () => window.clearInterval(id);
  }, [phase, answered, scenario, startedAt]);

  const onAnswer = useCallback((o: Outcome) => {
    if (!scenario || answered) return;
    const timeMs = Math.round(performance.now() - startedAt);
    let streak = 0;
    if (o.correct) { streak = 1; for (let i = attempts.length - 1; i >= 0 && attempts[i].correct; i--) streak++; }
    const score = scoreAnswer(o.correct, scenario.mode, timeMs, streak);
    const attempt: SessionAttempt = { mode: scenario.mode, level: scenario.level, skills: scenario.skills, correct: o.correct, timeMs, score: score.total };
    setAttempts((a) => [...a, attempt]);
    record({ mode: scenario.mode, level: scenario.level, skills: scenario.skills, correct: o.correct, timeMs, seed: scenario.seed, score: score.total });
    setAnswered({ ...o, timeMs, speed: speedFeedback(scenario.mode, timeMs), score, streak });
    vibrate(o.correct ? (streak >= 3 ? [20, 40, 20] : 20) : [60, 40, 60]);
  }, [answered, attempts, record, scenario, startedAt]);

  const next = useCallback(() => {
    if (!answered) return;
    if (isSessionOver(config, attempts.length)) { setPhase("result"); return; }
    if (config.level === "auto") setLevel((l) => nextAutoLevel(l, attempts.map((a) => a.correct)));
    setRound((r) => r + 1);
  }, [answered, attempts, config]);

  // Space (or N) advances once the answer is shown.
  useEffect(() => {
    if (!answered) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === " " || e.key.toLowerCase() === "n") { e.preventDefault(); next(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [answered, next]);

  const body = useMemo(() => {
    if (!scenario) return <div className="loading">Generating…</div>;
    const revealed = answered !== null;
    switch (scenario.mode) {
      case "hand-reading": return <HandReadingMode key={scenario.seed} scenario={scenario} revealed={revealed} onAnswer={onAnswer} />;
      case "winner": return <WinnerMode key={scenario.seed} scenario={scenario} revealed={revealed} onAnswer={onAnswer} />;
      case "pot": return <PotMode key={scenario.seed} scenario={scenario} revealed={revealed} onAnswer={onAnswer} />;
      case "side-pot": return <SidePotMode key={scenario.seed} scenario={scenario} revealed={revealed} onAnswer={onAnswer} />;
    }
  }, [scenario, answered, onAnswer]);

  if (phase === "start") {
    return <StartScreen train={train} defaultLevel={loaded ? profileLevel({ train, length: 10, level: "auto" }) : 1} onStart={start} />;
  }

  if (phase === "result") {
    return <SessionResult train={train} attempts={attempts} onAgain={() => start(config)} />;
  }

  const sessionCorrect = attempts.filter((a) => a.correct).length;
  const questionNo = attempts.length + (answered ? 0 : 1);
  const lengthLabel = config.length === "endless" ? "∞" : String(config.length);
  const currentTitle = scenario && config.train === "quick" ? MODE_INFO[scenario.mode].title : info.title;

  return (
    <div className="trainer">
      <header className="trainer-header">
        <div className="trainer-title">
          <Link href="/" className="icon-btn" aria-label="HOME"><ArrowLeft size={20} /></Link>
          <div>
            <h1>{currentTitle}</h1>
            <p className="trainer-subtitle">{scenario ? `LEVEL ${scenario.level}` : ""}{config.train === "quick" ? " · QUICK" : ""}</p>
          </div>
        </div>
        <div className="trainer-stats" aria-live="polite">
          <span className="stat-chip"><small>Q</small>{questionNo}/{lengthLabel}</span>
          <span className="stat-chip"><small>ACC</small>{formatPercent(attempts.length ? sessionCorrect / attempts.length : null)}</span>
          <span className="stat-chip"><small>STREAK</small>{answered ? answered.streak : (() => { let s = 0; for (let i = attempts.length - 1; i >= 0 && attempts[i].correct; i--) s++; return s; })()}</span>
          <span className="stat-chip stat-timer"><Timer size={14} />{((answered ? answered.timeMs : elapsed) / 1000).toFixed(1)}</span>
        </div>
      </header>

      <div className="trainer-body">{body}</div>

      {answered && (
        <div className={`feedback ${answered.correct ? "feedback-correct" : "feedback-wrong"}`} role="status">
          <div className="feedback-main">
            <div className="feedback-mark">{answered.correct ? <Check size={40} strokeWidth={3} /> : <X size={40} strokeWidth={3} />}</div>
            <div className="feedback-text">
              <div className="feedback-verdict">
                {answered.correct ? "CORRECT" : "INCORRECT"}
                {answered.correct && comboLabel(answered.streak) && <span className="combo">{comboLabel(answered.streak)} ×{answered.streak}</span>}
              </div>
              {!answered.correct && <div className="feedback-line"><small>Your Answer</small><span>{answered.yourAnswer}</span></div>}
              <div className="feedback-line"><small>{answered.correct ? "Answer" : "Correct"}</small><strong>{answered.correctAnswer}</strong></div>
              {answered.detail && <div className="feedback-detail">{answered.detail}</div>}
            </div>
          </div>
          <div className="feedback-side">
            <div className="feedback-time">
              <span className="feedback-seconds">{formatSeconds(answered.timeMs)}</span>
              <span className={`speed speed-${answered.speed.toLowerCase()}`}>{answered.speed}</span>
            </div>
            {answered.correct && (
              <div className="feedback-score">
                <span>+{answered.score.base}</span>
                {answered.score.speedBonus > 0 && <span><Zap size={12} /> Speed +{answered.score.speedBonus}</span>}
                {answered.score.streakBonus > 0 && <span>Streak ×{answered.streak} +{answered.score.streakBonus}</span>}
              </div>
            )}
            <button type="button" className="btn btn-primary btn-next" onClick={next} autoFocus>
              {isSessionOver(config, attempts.length) ? "RESULT" : "NEXT"} <kbd>Space</kbd>
            </button>
          </div>
        </div>
      )}
      {!answered && scenario && <p className="hint">{MODE_INFO[scenario.mode].shortcut}<span className="seed">seed {scenario.seed}</span></p>}
    </div>
  );
}

// ---------------------------------------------------------------------------

function StartScreen({ train, defaultLevel, onStart }: { train: TrainMode; defaultLevel: Level; onStart: (cfg: SessionConfig) => void }) {
  const info = MODE_INFO[train];
  const [length, setLength] = useState<SessionLength>(10);
  const [level, setLevel] = useState<LevelSetting>("auto");
  const startNow = useCallback(() => onStart({ train, length, level }), [onStart, train, length, level]);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Enter") { e.preventDefault(); startNow(); } };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [startNow]);
  return (
    <div className="start">
      <header className="trainer-header">
        <div className="trainer-title">
          <Link href="/" className="icon-btn" aria-label="HOME"><ArrowLeft size={20} /></Link>
          <div>
            <h1>{info.title}</h1>
            <p className="trainer-subtitle">{info.subtitle}</p>
          </div>
        </div>
      </header>
      <p className="start-desc">{info.description}</p>
      <section className="start-section">
        <h2>SESSION</h2>
        <div className="segmented">
          {SESSION_LENGTHS.map((l) => (
            <button key={String(l)} type="button" className={`seg ${length === l ? "seg-on" : ""}`} onClick={() => setLength(l)}>{l === "endless" ? "ENDLESS" : `${l}問`}</button>
          ))}
        </div>
      </section>
      <section className="start-section">
        <h2>LEVEL</h2>
        <div className="segmented">
          <button type="button" className={`seg ${level === "auto" ? "seg-on" : ""}`} onClick={() => setLevel("auto")}>AUTO<small>L{defaultLevel}〜</small></button>
          {LEVELS.map((l) => (
            <button key={l} type="button" className={`seg ${level === l ? "seg-on" : ""}`} onClick={() => setLevel(l)}>L{l}</button>
          ))}
        </div>
        <p className="muted small">AUTO: 3問連続正解でレベルアップ、2問連続不正解でレベルダウン。</p>
      </section>
      <button type="button" className="btn btn-primary btn-start" onClick={startNow}><Play size={22} /> START <kbd>Enter</kbd></button>
      <p className="hint">{info.shortcut}{info.shortcut ? " · " : ""}Space で次の問題</p>
    </div>
  );
}

// ---------------------------------------------------------------------------

function SessionResult({ train, attempts, onAgain }: { train: TrainMode; attempts: SessionAttempt[]; onAgain: () => void }) {
  const s = summarizeSession(attempts);
  const weakest = s.weakest === null ? "–" : s.weakest.kind === "skill" ? `${s.weakest.label}（${formatPercent(s.weakest.accuracy)}）` : `${MODE_INFO[s.weakest.mode].title}（${formatPercent(s.weakest.accuracy)}）`;
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Enter") { e.preventDefault(); onAgain(); } };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onAgain]);
  return (
    <div className="session-result">
      <h1>SESSION RESULT</h1>
      <p className="trainer-subtitle">{MODE_INFO[train].title}</p>
      <div className="result-grid">
        <div className="result-tile"><small>Accuracy</small><strong>{formatPercent(s.accuracy)}</strong></div>
        <div className="result-tile"><small>Average</small><strong>{formatSecondsShort(s.avgTimeMs)}</strong></div>
        <div className="result-tile"><small>Correct</small><strong>{s.correct} / {s.total}</strong></div>
        <div className="result-tile"><small>Best Streak</small><strong>{s.bestStreak}</strong></div>
        <div className="result-tile"><small>Score</small><strong>{s.score.toLocaleString("en-US")}</strong></div>
        <div className="result-tile result-weak"><small>Weakest Skill</small><strong>{weakest}</strong></div>
      </div>
      <div className="result-actions">
        <button type="button" className="btn btn-primary" onClick={onAgain}>もう一度 <kbd>Enter</kbd></button>
        <Link href="/profile/" className="btn">DEALER RATING</Link>
        <Link href="/" className="btn">HOME</Link>
      </div>
    </div>
  );
}
