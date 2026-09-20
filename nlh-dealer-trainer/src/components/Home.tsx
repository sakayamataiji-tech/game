"use client";
import Link from "next/link";
import { CheckCircle2, Circle, Coins, Flame, Layers, Play, Spade, Trophy } from "lucide-react";
import { MODES, Mode } from "@/engine/scenarioGenerator";
import { formatPercent, formatSecondsShort, MODE_INFO } from "@/lib/format";
import { accuracy, averageTimeMs, recommendedTraining, todayAgg } from "@/lib/stats";
import { dailyMissions, dayStreak, rankProgress, xpOf } from "@/lib/game";
import { useStats } from "@/lib/useStats";
import { Onboarding } from "./Onboarding";

const ICONS: Record<Mode, React.ReactNode> = {
  "hand-reading": <Spade size={28} />,
  winner: <Trophy size={28} />,
  pot: <Coins size={28} />,
  "side-pot": <Layers size={28} />,
};

/** Game lobby: rank & XP, daily streak and missions, big PLAY, the four drills. */
export function Home() {
  const { stats, loaded, setExperience } = useStats();
  const today = todayAgg(stats);
  const rec = recommendedTraining(stats);
  const rank = rankProgress(xpOf(stats));
  const streakDays = dayStreak(stats);
  const missions = dailyMissions(stats);
  return (
    <main className="home lobby">
      {loaded && !stats.profile.onboarded && <Onboarding onSelect={setExperience} />}
      <header className="home-hero">
        <h1>NLH DEALER TRAINER</h1>
        <p className="home-tagline">速く、正確に、判断する。</p>
      </header>

      <section className="rank-card" aria-label="ランク">
        <div className="rank-head">
          <div>
            <small>RANK {rank.rank.index + 1}</small>
            <strong>{loaded ? rank.rank.title : "–"}</strong>
            <span className="muted">{rank.rank.titleJa}</span>
          </div>
          <div className="day-streak" title="連続プレイ日数">
            <Flame size={22} />
            <strong>{loaded ? streakDays : "–"}</strong>
            <small>DAYS</small>
          </div>
        </div>
        <div className="xp-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(rank.progress * 100)}>
          <span style={{ width: `${Math.round(rank.progress * 100)}%` }} />
        </div>
        <div className="xp-meta">
          <span>{loaded ? rank.xp.toLocaleString("en-US") : "–"} XP</span>
          <span>{rank.next ? `NEXT ${rank.next.title} まで ${rank.remaining.toLocaleString("en-US")}` : "MAX RANK"}</span>
        </div>
      </section>

      <Link href="/train/quick/" className="btn btn-primary btn-play"><Play size={26} /> PLAY<small>QUICK TRAINING · 苦手カテゴリ多め</small></Link>

      <section className="missions" aria-label="デイリーミッション">
        <h2>DAILY MISSION</h2>
        <ul className="mission-list">
          {missions.map((m) => (
            <li key={m.id} className={m.complete ? "mission-done" : ""}>
              {m.complete ? <CheckCircle2 size={20} /> : <Circle size={20} />}
              <span className="mission-title">{m.title}</span>
              <span className="mission-progress">{loaded ? `${m.done}/${m.target}` : "–"}</span>
            </li>
          ))}
        </ul>
      </section>

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
                  {loaded && ms.attempts > 0 ? `${formatPercent(accuracy(ms))} · L${stats.profile.levels[mode]}` : "未挑戦"}
                  {recommended && <em className="rec-badge">おすすめ</em>}
                </span>
              </Link>
            );
          })}
        </div>
      </section>
    </main>
  );
}
