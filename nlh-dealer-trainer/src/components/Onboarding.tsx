"use client";
import { Experience, EXPERIENCES } from "@/lib/stats";

/** First launch: dealer experience sets the initial difficulty. */
export function Onboarding({ onSelect }: { onSelect: (e: Experience) => void }) {
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="onboarding-title">
      <div className="modal">
        <h2 id="onboarding-title">あなたのディーラー経験</h2>
        <p className="muted">初期の難易度（LEVEL）を決めるために使います。あとから DEALER RATING 画面で変更できます。</p>
        <div className="exp-grid">
          {EXPERIENCES.map((e) => (
            <button key={e.id} type="button" className="btn exp-btn" onClick={() => onSelect(e.id)}>
              <strong>{e.label}</strong>
              <small>LEVEL {e.level} から</small>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
