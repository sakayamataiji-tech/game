"use client";
import { useLayoutEffect } from "react";

export interface Choice {
  key: string;
  label: string;
  sub?: string;
  /** Keyboard shortcut (single character). */
  hotkey?: string;
}

interface Props {
  choices: Choice[];
  selected: string | null;
  correct: string | null;
  disabled: boolean;
  onSelect: (key: string) => void;
  columns?: number;
}

/**
 * Multiple-choice answer grid. Hotkeys are opt-in per choice, so number-input
 * modes never register 1-9 as shortcuts.
 */
export function ChoiceGrid({ choices, selected, correct, disabled, onSelect, columns = 3 }: Props) {
  // Layout effect: the hotkeys are live before the first paint, so a key pressed
  // the instant a question appears is never lost.
  useLayoutEffect(() => {
    if (disabled) return;
    const handler = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
      const hit = choices.find((c) => c.hotkey && c.hotkey.toLowerCase() === e.key.toLowerCase());
      if (hit) { e.preventDefault(); onSelect(hit.key); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [choices, disabled, onSelect]);

  return (
    <div className="choice-grid" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
      {choices.map((c) => {
        const isSel = selected === c.key;
        const isCorrect = correct === c.key;
        const cls = ["choice", isSel ? "choice-selected" : "", correct !== null && isCorrect ? "choice-correct" : "", correct !== null && isSel && !isCorrect ? "choice-wrong" : ""]
          .filter(Boolean).join(" ");
        return (
          <button key={c.key} type="button" className={cls} disabled={disabled} onClick={() => onSelect(c.key)}>
            {c.hotkey && <span className="choice-hotkey">{c.hotkey.toUpperCase()}</span>}
            <span className="choice-label">{c.label}</span>
            {c.sub && <span className="choice-sub">{c.sub}</span>}
          </button>
        );
      })}
    </div>
  );
}
