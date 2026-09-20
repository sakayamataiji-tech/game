"use client";
import { useEffect } from "react";

/** Registers the offline service worker (static export: /sw.js under the base path). */
export function ServiceWorker() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return;
    const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
    navigator.serviceWorker.register(`${base}/sw.js`, { scope: `${base}/` }).catch(() => { /* offline support is optional */ });
  }, []);
  return null;
}
