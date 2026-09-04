// Event tracking facade. Today it only logs; when a real backend is wired up
// (GA4 via gtag, or the portal SDK's own analytics) only this file changes.
const listeners = [];

export function track(event, props = {}) {
  const payload = { event, ts: Date.now(), ...props };
  if (import.meta.env?.DEV) console.debug('[analytics]', payload);
  if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
    try {
      window.gtag('event', event, props);
    } catch {
      /* ignore */
    }
  }
  for (const fn of listeners) fn(payload);
}

export function onTrack(fn) {
  listeners.push(fn);
}
