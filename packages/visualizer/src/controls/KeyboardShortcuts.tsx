import { onMount, onCleanup } from "solid-js"
import { useTimeline } from "@/context/timeline"
import { useConnection } from "@/context/connection"
import type { ActiveView, PlaybackSpeed } from "@/store/playback-store"

const VIEW_MAP: Record<string, ActiveView> = {
  "1": "sequence",
  "2": "flow",
  "3": "conversation",
  "4": "timeline",
  "5": "stats",
  "6": "sankey",
}

const SPEEDS: PlaybackSpeed[] = [0.25, 0.5, 1, 2, 4]

export function KeyboardShortcuts() {
  const tl = useTimeline()
  const conn = useConnection()

  function handler(e: KeyboardEvent) {
    const tag = (e.target as HTMLElement)?.tagName
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return

    const key = e.key

    // Space: toggle play/pause
    if (key === " ") {
      e.preventDefault()
      const mode = tl.state.mode
      if (mode === "live") {
        tl.setMode("paused")
      } else if (mode === "paused") {
        if (conn.state() === "connected") tl.setMode("live")
        else tl.setMode("playing")
      } else {
        tl.setMode("paused")
      }
      return
    }

    // Arrow keys: step through events
    if (key === "ArrowRight" || key === "ArrowLeft") {
      e.preventDefault()
      if (tl.state.mode !== "paused") tl.setMode("paused")
      const step = e.shiftKey ? 10 : 1
      const delta = key === "ArrowRight" ? step : -step
      tl.setCursor(tl.state.cursor + delta)
      return
    }

    // Home/End
    if (key === "Home") {
      e.preventDefault()
      if (tl.state.mode !== "paused") tl.setMode("paused")
      tl.setCursor(0)
      return
    }
    if (key === "End") {
      e.preventDefault()
      tl.setCursor(tl.state.entries.length - 1)
      if (conn.state() === "connected") tl.setMode("live")
      return
    }

    // 1-6: switch view
    if (VIEW_MAP[key]) {
      e.preventDefault()
      tl.setActiveView(VIEW_MAP[key])
      return
    }

    // d: toggle display mode
    if (key === "d") {
      tl.setDisplayMode(tl.displayMode() === "educational" ? "debug" : "educational")
      return
    }

    // +/= and -: speed control
    if (key === "+" || key === "=") {
      const cur = tl.speed()
      const idx = SPEEDS.indexOf(cur)
      if (idx < SPEEDS.length - 1) tl.setSpeed(SPEEDS[idx + 1])
      return
    }
    if (key === "-") {
      const cur = tl.speed()
      const idx = SPEEDS.indexOf(cur)
      if (idx > 0) tl.setSpeed(SPEEDS[idx - 1])
      return
    }

    // /: focus search
    if (key === "/") {
      e.preventDefault()
      const input = document.querySelector<HTMLInputElement>("[data-search-input]")
      input?.focus()
      return
    }

    // Escape: close detail panel
    if (key === "Escape") {
      tl.setSelectedEntry(null)
      return
    }
  }

  onMount(() => window.addEventListener("keydown", handler))
  onCleanup(() => window.removeEventListener("keydown", handler))

  return null
}
