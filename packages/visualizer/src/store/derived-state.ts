import { createMemo } from "solid-js"
import type { TimelineState } from "./timeline-store"
import type { TimelineEntry, Actor, Category } from "@/pipeline/actor-model"

export function createDerivedState(
  state: TimelineState,
  sessionFilter: () => string | null,
  searchQuery: () => string,
  categoryFilter: () => Category | null,
  actorFilter: () => Actor | null,
  toolNameFilter: () => string | null,
) {
  const filteredEntries = createMemo(() => {
    let entries = state.entries
    const session = sessionFilter()
    if (session) entries = entries.filter((e) => e.sessionID === session)
    const cat = categoryFilter()
    if (cat) entries = entries.filter((e) => e.category === cat)
    const actor = actorFilter()
    if (actor) entries = entries.filter((e) => e.from === actor || e.to === actor)
    const tool = toolNameFilter()
    if (tool) entries = entries.filter((e) => e.metadata?.toolName === tool)
    const q = searchQuery().toLowerCase()
    if (q) {
      entries = entries.filter(
        (e) =>
          e.label.toLowerCase().includes(q) ||
          e.shortLabel.toLowerCase().includes(q) ||
          (e.metadata?.toolName?.toLowerCase().includes(q) ?? false) ||
          (e.metadata?.error?.toLowerCase().includes(q) ?? false),
      )
    }
    return entries
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
