"use client";
import Link from "next/link";
import { BarChart3, Coins, Layers, Spade, Trophy, User, Zap } from "lucide-react";
import { MODES, Mode } from "@/engine/scenarioGenerator";
import { formatPercent, formatSecondsShort, MODE_INFO } from "@/lib/format";
import { accuracy, averageTimeMs, recommendedTraining, todayAgg } from "@/lib/stats";
import { useStats } from "@/lib/useStats";
import { Onboarding } from "./Onboarding";

const ICONS: Record<Mode, React.ReactNode> = {
  "hand-reading": <Spade size={26} />,
  winner: <Trophy size={26} />,
  pot: <Coins size={26} />,
  "side-pot": <Layers size={26} />,
};

export function Home() {
  const { stats, loaded, setExperience } = useStats();
  const today = todayAgg(stats);
  const rec = recommendedTraining(stats);
  return (
    <main className="home">
      {loaded && !stats.profile.onboarded && <Onboarding onSelect={setExperience} />}
      <header className="home-hero">
        <h1>NLH DEALER TRAINER</h1>
        <p className="home-tagline">速く、正確に、判断する。</p>
      </header>

      <section className="today" aria-label="今日の成績">
        <h2>TODAY</h2>
        <div className="today-grid">
          <div className="today-tile"><small>Accuracy</small><strong>{loaded ? formatPercent(accuracy(today)) : "–"}</strong></div>
          <div className="today-tile"><small>Avg Speed</small><strong>{loaded ? formatSecondsShort(averageTimeMs(today)) : "–"}</strong></div>
          <div className="today-tile"><small>Streak</small><strong>{loaded ? stats.totals.currentStreak : "–"}</strong></div>
        </div>
      </section>

      <section className="menu" aria-label="Training">
        <h2>TRAINING</h2>
        <div className="mode-cards">
          {MODES.map((mode) => {
            const info = MODE_INFO[mode];
            const ms = stats.modes[mode];
            const recommended = rec.modes.includes(mode) && stats.totals.attempts > 0;
            return (
              <Link key={mode} href={`/train/${mode}/`} className={`mode-card mode-card-${mode}`}>
                <span className="mode-card-icon">{ICONS[mode]}</span>
                <span className="mode-card-title">{info.title}</span>
                <span className="mode-card-sub">{info.subtitle}</span>
                <span className="mode-card-stats">
                  {loaded && ms.attempts > 0 ? `${formatPercent(accuracy(ms))} · ${ms.attempts}問 · L${stats.profile.levels[mode]}` : "未挑戦"}
                  {recommended && <em className="rec-badge">RECOMMENDED</em>}
                </span>
              </Link>
            );
          })}
        </div>
        <Link href="/train/quick/" className="btn btn-primary btn-quick"><Zap size={22} /> QUICK TRAINING</Link>
      </section>

      <nav className="home-nav">
        <Link href="/stats/" className="btn"><BarChart3 size={18} /> STATS</Link>
        <Link href="/profile/" className="btn"><User size={18} /> DEALER RATING</Link>
      </nav>
    </main>
  );
}
