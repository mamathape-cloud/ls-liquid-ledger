"use client";

import { useEffect } from "react";

/** Registers a minimal service worker so the app meets installability criteria. */
export function PwaRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    async function init() {
      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(
          keys.filter((key) => key === "liquid-ledger-v1").map((key) => caches.delete(key))
        );
      }

      await navigator.serviceWorker.register("/sw.js");
    }

    init().catch(() => {
      // Non-fatal: manifest still enables basic add-to-home-screen on some platforms
    });
  }, []);

  return null;
}
