import { createEffect, onCleanup } from "solid-js"
import { useTimeline } from "@/context/timeline"
import { useConnection } from "@/context/connection"

/**
 * Reactive playback engine. Mount this component to enable auto-advancing
 * of the cursor when mode is "playing".
 */
export function PlaybackEngine() {
  const tl = useTimeline()
  const conn = useConnection()

  createEffect(() => {
    const mode = tl.state.mode
    if (mode !== "playing") return

    let timer: ReturnType<typeof setTimeout> | undefined
    let cancelled = false

    function advance() {
      if (cancelled) return

      const entries = tl.state.entries
      const cursor = tl.state.cursor
      const speed = tl.speed()

      if (cursor >= entries.length - 1) {
        // Reached the end
        if (conn.state() === "connected") {
          tl.setMode("live")
        } else {
          tl.setMode("paused")
        }
        return
      }

      // Advance cursor
      tl.setCursor(cursor + 1)

      // Calculate delay until next event based on actual timestamps
      const current = entries[cursor]
      const next = entries[cursor + 1]
      if (current && next) {
        const realDelay = next.timestamp - current.timestamp
        const scaledDelay = Math.max(16, Math.min(2000, realDelay / speed))
        timer = setTimeout(advance, scaledDelay)
      } else {
        timer = setTimeout(advance, 100 / speed)
      }
    }

    advance()

    onCleanup(() => {
      cancelled = true
      if (timer) clearTimeout(timer)
    })
  })

  return null
}
