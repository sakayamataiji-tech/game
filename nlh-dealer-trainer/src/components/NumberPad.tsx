"use client";

export type PadKey = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "00" | "back" | "clear" | "enter";

interface Props {
  onKey: (k: PadKey) => void;
  disabled?: boolean;
  enterLabel?: string;
}

const ROWS: PadKey[][] = [
  ["7", "8", "9"],
  ["4", "5", "6"],
  ["1", "2", "3"],
  ["00", "0", "back"],
];

/** On-screen keypad for chip amounts (iPad friendly). Digits only type into the active field. */
export function NumberPad({ onKey, disabled = false, enterLabel = "回答" }: Props) {
  return (
    <div className="numpad" role="group" aria-label="テンキー">
      {ROWS.flat().map((k) => (
        <button
          key={k}
          type="button"
          className={`numpad-key ${k === "back" ? "numpad-back" : ""}`}
          disabled={disabled}
          onPointerDown={(e) => e.preventDefault() /* keep the input focused */}
          onClick={() => onKey(k)}
        >
          {k === "back" ? "⌫" : k}
        </button>
      ))}
      <button type="button" className="numpad-key numpad-clear" disabled={disabled} onPointerDown={(e) => e.preventDefault()} onClick={() => onKey("clear")}>C</button>
      <button type="button" className="numpad-key numpad-enter" disabled={disabled} onPointerDown={(e) => e.preventDefault()} onClick={() => onKey("enter")}>{enterLabel}</button>
    </div>
  );
}
