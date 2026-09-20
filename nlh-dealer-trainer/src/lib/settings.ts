"use client";
import { useCallback, useEffect, useState } from "react";

export const SETTINGS_KEY = "nlh-dealer-trainer.settings";

export interface Settings {
  vibration: boolean;
}

const DEFAULTS: Settings = { vibration: true };

function read(): Settings {
  try {
    const raw = typeof window !== "undefined" ? window.localStorage.getItem(SETTINGS_KEY) : null;
    if (!raw) return DEFAULTS;
    const o = JSON.parse(raw) as Partial<Settings>;
    return { ...DEFAULTS, ...(typeof o.vibration === "boolean" ? { vibration: o.vibration } : {}) };
  } catch { return DEFAULTS; }
}

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  useEffect(() => { setSettings(read()); }, []);
  const update = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      try { window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }, []);
  return { settings, update };
}

/** Haptic tick (Android Chrome etc.; a no-op where unsupported). */
export function vibrate(pattern: number | number[]): void {
  try {
    if (read().vibration && typeof navigator !== "undefined" && typeof navigator.vibrate === "function") navigator.vibrate(pattern);
  } catch { /* ignore */ }
}
