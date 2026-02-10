import { createContext, useContext, type ParentProps } from "solid-js"
import { createTimelineStore } from "@/store/timeline-store"
import { createDerivedState } from "@/store/derived-state"
import { createPlaybackStore } from "@/store/playback-store"
import type { TimelineEntry } from "@/pipeline/actor-model"

type TimelineContextValue = ReturnType<typeof createTimelineStore> & ReturnType<typeof createDerivedState> & ReturnType<typeof createPlaybackStore>

const TimelineContext = createContext<TimelineContextValue>()

export function TimelineProvider(props: ParentProps) {
  const timeline = createTimelineStore()
  const playback = createPlaybackStore()
  const derived = createDerivedState(
    timeline.state,
    playback.sessionFilter,
    playback.searchQuery,
    playback.categoryFilter,
    playback.actorFilter,
    playback.toolNameFilter,
  )

  const value: TimelineContextValue = {
    ...timeline,
    ...derived,
    ...playback,
  }

  return <TimelineContext.Provider value={value}>{props.children}</TimelineContext.Provider>
}

export function useTimeline() {
  const ctx = useContext(TimelineContext)
  if (!ctx) throw new Error("useTimeline must be used within TimelineProvider")
  return ctx
}
