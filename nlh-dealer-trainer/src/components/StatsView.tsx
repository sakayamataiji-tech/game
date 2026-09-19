"use client";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { MODES } from "@/engine/scenarioGenerator";
import { LEVELS } from "@/engine/rating";
import { formatDuration, formatPercent, formatSecondsShort, MODE_INFO } from "@/lib/format";
import { accuracy, averageTimeMs, recentAccuracy, skillReports, STATS_SCHEMA_VERSION } from "@/lib/stats";
import { useStats } from "@/lib/useStats";

export function StatsView() {
  const { stats, loaded } = useStats();
  const t = stats.totals;
  const skills = skillReports(stats, 1);
  return (
    <main className="stats">
      <header className="trainer-header">
        <div className="trainer-title">
          <Link href="/" className="icon-btn" aria-label="HOME"><ArrowLeft size={20} /></Link>
          <div>
            <h1>STATS</h1>
            <p className="trainer-subtitle">この端末に保存（localStorage · schema v{STATS_SCHEMA_VERSION}）</p>
          </div>
        </div>
      </header>

      <section className="today">
        <h2>OVERALL</h2>
        <div className="today-grid today-grid-5">
          <div className="today-tile"><small>総回答数</small><strong>{loaded ? t.attempts : "–"}</strong></div>
          <div className="today-tile"><small>正解数</small><strong>{loaded ? t.correct : "–"}</strong></div>
          <div className="today-tile"><small>正答率</small><strong>{formatPercent(accuracy(t))}</strong></div>
          <div className="today-tile"><small>平均回答時間</small><strong>{formatSecondsShort(averageTimeMs(t))}</strong></div>
          <div className="today-tile"><small>連続 / Best</small><strong>{t.currentStreak} / {t.bestStreak}</strong></div>
        </div>
      </section>

      <section>
        <h2>BY CATEGORY</h2>
        <table className="stats-table">
          <thead>
            <tr><th>モード</th><th className="num">問題数</th><th className="num">正答率</th><th className="num">直近20問</th><th className="num">連続</th><th className="num">Best</th><th className="num">平均時間</th><th className="num">Score</th></tr>
          </thead>
          <tbody>
            {MODES.map((mode) => {
              const ms = stats.modes[mode];
              return (
                <tr key={mode}>
                  <td><Link href={`/train/${mode}/`}>{MODE_INFO[mode].title}</Link></td>
                  <td className="num">{ms.attempts}</td>
                  <td className="num">{formatPercent(accuracy(ms))}</td>
                  <td className="num">{formatPercent(recentAccuracy(ms, 20))}</td>
                  <td className="num">{ms.currentStreak}</td>
                  <td className="num">{ms.bestStreak}</td>
                  <td className="num">{averageTimeMs(ms) === null ? "–" : formatDuration(averageTimeMs(ms)!)}</td>
                  <td className="num">{ms.score.toLocaleString("en-US")}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <section>
        <h2>BY LEVEL</h2>
        <table className="stats-table">
          <thead>
            <tr><th>モード</th>{LEVELS.map((l) => <th key={l} className="num">L{l}</th>)}</tr>
          </thead>
          <tbody>
            {MODES.map((mode) => (
              <tr key={mode}>
                <td>{MODE_INFO[mode].title}</td>
                {LEVELS.map((l) => {
                  const a = stats.modes[mode].levels[l];
                  return <td key={l} className="num">{a.attempts === 0 ? "–" : `${formatPercent(accuracy(a))} (${a.attempts})`}</td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h2>BY SKILL</h2>
        {skills.length === 0 ? <p className="muted">まだデータがありません。</p> : (
          <div className="skill-list">
            {skills.map((s) => (
              <div key={s.id} className="skill-row">
                <span className="skill-name">{s.label}<small>{s.labelJa} · {MODE_INFO[s.mode].title}</small></span>
                <span className="skill-bar"><span className={`skill-fill ${s.accuracy < 0.7 ? "fill-bad" : s.accuracy < 0.85 ? "fill-mid" : "fill-good"}`} style={{ width: `${Math.round(s.accuracy * 100)}%` }} /></span>
                <span className="skill-pct">{formatPercent(s.accuracy)}<small>{s.attempts}問</small></span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="recent">
        <h2>RECENT</h2>
        {MODES.map((mode) => {
          const r = stats.modes[mode].recent.slice(-40);
          if (r.length === 0) return null;
          return (
            <div key={mode} className="recent-row">
              <span className="recent-label">{MODE_INFO[mode].title}</span>
              <span className="recent-dots">
                {r.map((a, i) => <span key={i} className={`dot ${a.correct ? "dot-ok" : "dot-ng"}`} title={`L${a.level} ${a.correct ? "✓" : "×"} ${formatDuration(a.timeMs)}`} />)}
              </span>
            </div>
          );
        })}
      </section>
    </main>
  );
}
