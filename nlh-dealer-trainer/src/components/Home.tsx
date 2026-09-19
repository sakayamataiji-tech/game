"use client";
import Link from "next/link";
import { MODES } from "@/engine/scenarioGenerator";
import { formatPercent, MODE_INFO } from "@/lib/format";
import { accuracy } from "@/lib/stats";
import { useStats } from "@/lib/useStats";

export function Home() {
  const { stats, loaded } = useStats();
  return (
    <main className="home">
      <header className="home-header">
        <h1>NLH Dealer Trainer</h1>
        <p>ノーリミットホールデム ディーラー訓練。問題はすべてランダム生成、正解はルールエンジンが導出します。</p>
      </header>
      <div className="mode-cards">
        {MODES.map((mode) => {
          const info = MODE_INFO[mode];
          const ms = stats.modes[mode];
          return (
            <Link key={mode} href={`/train/${mode}/`} className={`mode-card mode-card-${mode}`}>
              <span className="mode-card-title">{info.title}</span>
              <span className="mode-card-sub">{info.subtitle}</span>
              <span className="mode-card-desc">{info.description}</span>
              <span className="mode-card-stats">
                {loaded && ms.attempts > 0 ? `正答率 ${formatPercent(accuracy(ms))}・${ms.attempts}問・最高連続 ${ms.bestStreak}` : "未挑戦"}
              </span>
            </Link>
          );
        })}
      </div>
      <nav className="home-nav">
        <Link href="/stats/" className="btn">統計を見る</Link>
      </nav>
      <footer className="home-footer">
        <p>ルール: レイズは「レイズ to（そのストリートの合計額）」表記。アンテなし。ミニマムレイズは直前のベット／レイズ幅以上。ショートオールインはレイズ権を再開しません。</p>
      </footer>
    </main>
  );
}
