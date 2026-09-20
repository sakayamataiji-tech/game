"use client";
import Link from "next/link";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { MODES, Mode } from "@/engine/scenarioGenerator";
import { LEVELS, Level, rateMode, rateOverall, RatingInput, RATING_MIN_ATTEMPTS } from "@/engine/rating";
import { formatPercent, formatSecondsShort, MODE_INFO } from "@/lib/format";
import { EXPERIENCES, recommendedTraining } from "@/lib/stats";
import { useStats } from "@/lib/useStats";
import { useSettings } from "@/lib/settings";
import { rankProgress, RANKS, xpOf } from "@/lib/game";

export function ProfileView() {
  const { stats, loaded, setExperience, patchProfile, reset } = useStats();
  const { settings, update } = useSettings();
  const [confirming, setConfirming] = useState(false);
  const rank = rankProgress(xpOf(stats));
  const inputs = {} as Record<Mode, RatingInput>;
  for (const m of MODES) {
    const ms = stats.modes[m];
    inputs[m] = { attempts: ms.attempts, correct: ms.correct, totalTimeMs: ms.totalTimeMs, levelSum: ms.levelSum };
  }
  const overall = rateOverall(inputs);
  const rec = recommendedTraining(stats);

  return (
    <main className="profile">
      <header className="trainer-header">
        <div className="trainer-title">
          <Link href="/" className="icon-btn" aria-label="HOME"><ArrowLeft size={20} /></Link>
          <div>
            <h1>DEALER RATING</h1>
            <p className="trainer-subtitle">Accuracy · Speed · Difficulty から算出（各モード {RATING_MIN_ATTEMPTS} 問以上で判定）</p>
          </div>
        </div>
      </header>

      <section className="rating">
        <div className="rating-grid">
          {MODES.map((m) => {
            const r = rateMode(m, inputs[m]);
            return (
              <div key={m} className={`rating-tile grade-${r.grade === "-" ? "none" : r.grade}`}>
                <small>{MODE_INFO[m].title}</small>
                <strong>{loaded ? r.grade : "–"}</strong>
                <span className="rating-meta">{formatPercent(r.accuracy)} · {formatSecondsShort(r.avgTimeMs)}{r.avgLevel !== null ? ` · L${r.avgLevel.toFixed(1)}` : ""}</span>
              </div>
            );
          })}
          <div className={`rating-tile rating-overall grade-${overall.grade === "-" ? "none" : overall.grade}`}>
            <small>OVERALL</small>
            <strong>{loaded ? overall.grade : "–"}</strong>
            <span className="rating-meta">{overall.points !== null ? `${overall.points} pt` : `${stats.totals.attempts} 問`}</span>
          </div>
        </div>
      </section>

      <section className="ranks">
        <h2>RANK</h2>
        <ol className="rank-list">
          {RANKS.map((r) => (
            <li key={r.index} className={r.index === rank.rank.index ? "rank-current" : r.index < rank.rank.index ? "rank-done" : ""}>
              <span>{r.title}<small>{r.titleJa}</small></span>
              <strong>{r.threshold.toLocaleString("en-US")} XP</strong>
            </li>
          ))}
        </ol>
        <p className="muted small">XP はスコアの累計。正解 +100、速さと連続正解でボーナス。</p>
      </section>

      <section className="weakness">
        <h2>WEAKNESS</h2>
        {rec.skills.length === 0 && rec.modes.length === 0 ? <p className="muted">データが溜まると苦手分野が表示されます。</p> : (
          <>
            {rec.skills.length > 0 && (
              <ul className="weak-list">
                {rec.skills.map((s) => <li key={s.id}><span>{s.label}<small>{s.labelJa}</small></span><strong>{formatPercent(s.accuracy)}</strong></li>)}
              </ul>
            )}
            <h3>Recommended Training</h3>
            <div className="rec-links">
              {rec.modes.map((m) => <Link key={m} href={`/train/${m}/`} className="btn btn-primary">{MODE_INFO[m].title}</Link>)}
              {rec.skills.slice(0, 2).map((s) => <Link key={s.id} href={`/train/${s.mode}/`} className="btn">{s.label.toUpperCase()}</Link>)}
            </div>
            <p className="muted small">苦手スキルは問題生成で優先的に出題されます。QUICK TRAINING では苦手モードが多めに出ます。</p>
          </>
        )}
      </section>

      <section className="settings">
        <h2>PROFILE</h2>
        <div className="setting-row">
          <span>バイブレーション</span>
          <div className="segmented">
            <button type="button" className={`seg ${settings.vibration ? "seg-on" : ""}`} onClick={() => update({ vibration: true })}>ON</button>
            <button type="button" className={`seg ${!settings.vibration ? "seg-on" : ""}`} onClick={() => update({ vibration: false })}>OFF</button>
          </div>
        </div>
        <div className="setting-row">
          <span>ディーラー経験</span>
          <div className="segmented">
            {EXPERIENCES.map((e) => (
              <button key={e.id} type="button" className={`seg ${stats.profile.experience === e.id ? "seg-on" : ""}`} onClick={() => setExperience(e.id)}>{e.label}</button>
            ))}
          </div>
        </div>
        {MODES.map((m) => (
          <div key={m} className="setting-row">
            <span>{MODE_INFO[m].title} の開始レベル</span>
            <div className="segmented">
              {LEVELS.map((l) => (
                <button key={l} type="button" className={`seg ${stats.profile.levels[m] === l ? "seg-on" : ""}`} onClick={() => patchProfile({ levels: { ...stats.profile.levels, [m]: l as Level } })}>L{l}</button>
              ))}
            </div>
          </div>
        ))}
        <div className="stats-actions">
          {!confirming
            ? <button type="button" className="btn btn-danger" onClick={() => setConfirming(true)}>統計をリセット</button>
            : (
              <>
                <span>すべての成績とプロフィールを消去します。よろしいですか？</span>
                <button type="button" className="btn btn-danger" onClick={() => { reset(); setConfirming(false); }}>はい、消去する</button>
                <button type="button" className="btn" onClick={() => setConfirming(false)}>やめる</button>
              </>
            )}
        </div>
      </section>
    </main>
  );
}
