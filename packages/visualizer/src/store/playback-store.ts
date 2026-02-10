import { createSignal } from "solid-js"
import type { TimelineEntry, Actor, Category } from "@/pipeline/actor-model"

export type PlaybackSpeed = 0.25 | 0.5 | 1 | 2 | 4
export type DisplayMode = "educational" | "debug"
export type ActiveView = "flow" | "sequence" | "timeline" | "stats" | "sankey" | "conversation"

export function createPlaybackStore() {
  const [speed, setSpeed] = createSignal<PlaybackSpeed>(1)
  const [displayMode, setDisplayMode] = createSignal<DisplayMode>("educational")
  const [activeView, setActiveView] = createSignal<ActiveView>("sequence")
  const [sessionFilter, setSessionFilter] = createSignal<string | null>(null)
  const [selectedEntry, setSelectedEntry] = createSignal<TimelineEntry | null>(null)
  const [searchQuery, setSearchQuery] = createSignal("")
  const [categoryFilter, setCategoryFilter] = createSignal<Category | null>(null)
  const [actorFilter, setActorFilter] = createSignal<Actor | null>(null)
  const [toolNameFilter, setToolNameFilter] = createSignal<string | null>(null)

  return {
    speed,
    setSpeed,
    displayMode,
    setDisplayMode,
    activeView,
    setActiveView,
    sessionFilter,
    setSessionFilter,
    selectedEntry,
    setSelectedEntry,
    searchQuery,
    setSearchQuery,
    categoryFilter,
    setCategoryFilter,
    actorFilter,
    setActorFilter,
    toolNameFilter,
    setToolNameFilter,
  }
}
