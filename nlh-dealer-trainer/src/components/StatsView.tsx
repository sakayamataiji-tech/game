"use client";
import Link from "next/link";
import { useState } from "react";
import { MODES } from "@/engine/scenarioGenerator";
import { formatDuration, formatPercent, MODE_INFO } from "@/lib/format";
import { accuracy, averageTimeMs, recentAccuracy, STATS_SCHEMA_VERSION } from "@/lib/stats";
import { useStats } from "@/lib/useStats";

export function StatsView() {
  const { stats, loaded, reset } = useStats();
  const [confirming, setConfirming] = useState(false);
  return (
    <main className="stats">
      <header className="trainer-header">
        <div className="trainer-title">
          <Link href="/" className="back-link" aria-label="ホームへ">←</Link>
          <div>
            <h1>STATS</h1>
            <p className="trainer-subtitle">成績（この端末のブラウザに保存・schema v{STATS_SCHEMA_VERSION}）</p>
          </div>
        </div>
      </header>
      <table className="stats-table">
        <thead>
          <tr>
            <th>モード</th>
            <th className="num">問題数</th>
            <th className="num">正答率</th>
            <th className="num">直近20問</th>
            <th className="num">現在連続</th>
            <th className="num">最高連続</th>
            <th className="num">平均時間</th>
          </tr>
        </thead>
        <tbody>
          {MODES.map((mode) => {
            const ms = stats.modes[mode];
            return (
              <tr key={mode}>
                <td><Link href={`/train/${mode}/`}>{MODE_INFO[mode].title}</Link></td>
                <td className="num">{loaded ? ms.attempts : "…"}</td>
                <td className="num">{formatPercent(accuracy(ms))}</td>
                <td className="num">{formatPercent(recentAccuracy(ms, 20))}</td>
                <td className="num">{ms.currentStreak}</td>
                <td className="num">{ms.bestStreak}</td>
                <td className="num">{averageTimeMs(ms) === null ? "–" : formatDuration(averageTimeMs(ms)!)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <section className="recent">
        <h2>直近の結果</h2>
        {MODES.map((mode) => {
          const r = stats.modes[mode].recent.slice(-30);
          if (r.length === 0) return null;
          return (
            <div key={mode} className="recent-row">
              <span className="recent-label">{MODE_INFO[mode].title}</span>
              <span className="recent-dots" aria-label={`${MODE_INFO[mode].title} の直近${r.length}問`}>
                {r.map((a, i) => <span key={i} className={`dot ${a.correct ? "dot-ok" : "dot-ng"}`} title={`${a.correct ? "正解" : "不正解"} ${formatDuration(a.timeMs)}`} />)}
              </span>
            </div>
          );
        })}
      </section>
      <div className="stats-actions">
        {!confirming
          ? <button type="button" className="btn btn-danger" onClick={() => setConfirming(true)}>統計をリセット</button>
          : (
            <>
              <span>本当にリセットしますか？</span>
              <button type="button" className="btn btn-danger" onClick={() => { reset(); setConfirming(false); }}>はい、消去する</button>
              <button type="button" className="btn" onClick={() => setConfirming(false)}>やめる</button>
            </>
          )}
      </div>
    </main>
  );
}
