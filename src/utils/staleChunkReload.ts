import { capturePostHogEventBeforeReload } from './posthog'

const LAST_RELOAD_AT_KEY = 'tripjournal:stale-chunk-reload-at'
const MIN_MS_BETWEEN_RELOADS = 10_000

// After a redeploy, an open tab can request a lazy route chunk that the new build no longer serves.
// Reload once to pick up the new build. The time guard stops a reload loop when a chunk is truly missing.
export function registerStaleChunkReload(): void {
  window.addEventListener('vite:preloadError', (event) => {
    try {
      const lastReloadAt = Number(sessionStorage.getItem(LAST_RELOAD_AT_KEY))
      if (Date.now() - lastReloadAt < MIN_MS_BETWEEN_RELOADS) {
        return
      }

      sessionStorage.setItem(LAST_RELOAD_AT_KEY, String(Date.now()))
    } catch {
      // Without sessionStorage there is no loop guard, so let the error surface.
      return
    }

    capturePostHogEventBeforeReload('stale_chunk_reload', {
      error_message: event.payload instanceof Error ? event.payload.message : String(event.payload),
    })
    window.location.reload()
  })
}
