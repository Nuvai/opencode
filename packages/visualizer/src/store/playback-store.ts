import { createSignal } from "solid-js"

export type PlaybackSpeed = 0.25 | 0.5 | 1 | 2 | 4
export type DisplayMode = "educational" | "debug"
export type ActiveView = "flow" | "sequence"

export function createPlaybackStore() {
  const [speed, setSpeed] = createSignal<PlaybackSpeed>(1)
  const [displayMode, setDisplayMode] = createSignal<DisplayMode>("educational")
  const [activeView, setActiveView] = createSignal<ActiveView>("sequence")
  const [sessionFilter, setSessionFilter] = createSignal<string | null>(null)

  return {
    speed,
    setSpeed,
    displayMode,
    setDisplayMode,
    activeView,
    setActiveView,
    sessionFilter,
    setSessionFilter,
  }
}
