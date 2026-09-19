"use client";
import { useCallback, useEffect, useState } from "react";
import type { Mode } from "@/engine/scenarioGenerator";
import { AttemptRecord, clearStats, emptyStats, loadStats, recordAttempt, saveStats, Stats } from "./stats";

function storage() {
  try { return typeof window !== "undefined" ? window.localStorage : null; } catch { return null; }
}

/** Stats live in localStorage; they are loaded after mount so SSR/static HTML never sees them. */
export function useStats() {
  const [stats, setStats] = useState<Stats>(() => emptyStats());
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setStats(loadStats(storage()));
    setLoaded(true);
  }, []);

  const record = useCallback((mode: Mode, attempt: Omit<AttemptRecord, "ts">) => {
    setStats((prev) => {
      const next = recordAttempt(prev, mode, attempt);
      saveStats(storage(), next);
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    clearStats(storage());
    setStats(emptyStats());
  }, []);

  return { stats, loaded, record, reset };
}
