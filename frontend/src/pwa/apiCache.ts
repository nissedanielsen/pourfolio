// The service worker keeps the latest API answers so the app works offline (vite.config.ts,
// runtimeCaching "api"). They hold the inventory, so they go when the user signs out.

const API_CACHE = 'api'

/** Removes the cached API answers. Never fails: there may be no Cache API (old browsers, tests). */
export async function clearApiCache(): Promise<void> {
  try {
    if ('caches' in globalThis) await caches.delete(API_CACHE)
  } catch {
    // Nothing to clean up.
  }
}
