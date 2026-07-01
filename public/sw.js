/**
 * Minimal service worker for PWA installability.
 * Does not intercept or cache navigations — safe for dev and production.
 */

const LEGACY_CACHES = ["liquid-ledger-v1"];

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => LEGACY_CACHES.includes(key)).map((key) => caches.delete(key))
      )
    )
  );
});
