import { createMemo } from "solid-js"
import type { TimelineState } from "./timeline-store"
import type { TimelineEntry, Actor } from "@/pipeline/actor-model"

export function createDerivedState(state: TimelineState, sessionFilter: () => string | null) {
  const filteredEntries = createMemo(() => {
    const filter = sessionFilter()
    if (!filter) return state.entries
    return state.entries.filter((e) => e.sessionID === filter)
  })

  const visibleEntries = createMemo(() => {
    const entries = filteredEntries()
    const cursor = state.cursor
    // Map cursor from global index to filtered index
    if (!sessionFilter()) {
      return entries.slice(0, cursor + 1)
    }
    // With filter: show entries up to the global cursor's timestamp
    const cursorEntry = state.entries[cursor]
    if (!cursorEntry) return entries
    return entries.filter((e) => e.sequenceIndex <= cursorEntry.sequenceIndex)
  })

  const currentEntry = createMemo((): TimelineEntry | undefined => {
    const entries = filteredEntries()
    const cursor = state.cursor
    if (!sessionFilter()) return entries[cursor]
    const cursorEntry = state.entries[cursor]
    if (!cursorEntry) return undefined
    // Find the nearest filtered entry at or before cursor
    const visible = visibleEntries()
    return visible[visible.length - 1]
  })

  const recentEdges = createMemo(() => {
    const visible = visibleEntries()
    return visible.slice(-8)
  })

  const activeActors = createMemo((): Set<Actor> => {
    const recent = recentEdges()
    const actors = new Set<Actor>()
    for (const entry of recent) {
      actors.add(entry.from)
      actors.add(entry.to)
    }
    return actors
  })

  const sessionIDs = createMemo((): string[] => {
    const seen = new Set<string>()
    for (const entry of state.entries) {
      if (entry.sessionID) seen.add(entry.sessionID)
    }
    return Array.from(seen)
  })

  return {
    filteredEntries,
    visibleEntries,
    currentEntry,
    recentEdges,
    activeActors,
    sessionIDs,
  }
}
