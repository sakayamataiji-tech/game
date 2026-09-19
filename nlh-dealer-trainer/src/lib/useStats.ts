"use client";
import { useCallback, useEffect, useState } from "react";
import { AttemptInput, clearStats, emptyStats, Experience, loadStats, recordAttempt, saveStats, setExperience as setExp, setProfile, Stats, Profile } from "./stats";

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

  const update = useCallback((fn: (prev: Stats) => Stats) => {
    setStats((prev) => {
      const next = fn(prev);
      saveStats(storage(), next);
      return next;
    });
  }, []);

  const record = useCallback((attempt: AttemptInput) => update((prev) => recordAttempt(prev, attempt)), [update]);
  const setExperience = useCallback((e: Experience) => update((prev) => setExp(prev, e)), [update]);
  const patchProfile = useCallback((patch: Partial<Profile>) => update((prev) => setProfile(prev, patch)), [update]);
  const reset = useCallback(() => {
    clearStats(storage());
    setStats(emptyStats());
  }, []);

  return { stats, loaded, record, setExperience, patchProfile, reset };
}
