"use client";
import { useEffect } from "react";
import type { PadKey } from "@/components/NumberPad";

/**
 * Routes physical keyboard digits / Backspace / Enter / Escape to the same
 * handler as the on-screen keypad. Only digits are captured, so number modes
 * never treat 1-9 as answer shortcuts.
 */
export function useDigitInput(onKey: (k: PadKey) => void, enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    const handler = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (/^[0-9]$/.test(e.key)) { e.preventDefault(); onKey(e.key as PadKey); }
      else if (e.key === "Backspace") { e.preventDefault(); onKey("back"); }
      else if (e.key === "Enter") { e.preventDefault(); onKey("enter"); }
      else if (e.key === "Escape") { e.preventDefault(); onKey("clear"); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onKey, enabled]);
}

/** Apply a keypad key to a digit string. */
export function applyPadKey(value: string, k: PadKey, maxLen = 9): string {
  if (k === "back") return value.slice(0, -1);
  if (k === "clear") return "";
  if (k === "enter") return value;
  const next = (value + k).replace(/^0+(?=\d)/, "");
  return next.slice(0, maxLen);
}
