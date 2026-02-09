import { createStore, produce } from "solid-js/store"
import type { TimelineEntry } from "@/pipeline/actor-model"

export type TimelineMode = "live" | "paused" | "playing"

export type TimelineState = {
  entries: TimelineEntry[]
  cursor: number
  mode: TimelineMode
  snapshots: Map<number, number> // every 100 entries, store the index for quick seeking
}

const SNAPSHOT_INTERVAL = 100

export function createTimelineStore() {
  const [state, setState] = createStore<TimelineState>({
    entries: [],
    cursor: 0,
    mode: "live",
    snapshots: new Map(),
  })

  function append(entry: TimelineEntry) {
    setState(
      produce((s) => {
        s.entries.push(entry)
        const idx = s.entries.length - 1

        // Take a snapshot periodically
        if (idx % SNAPSHOT_INTERVAL === 0) {
          s.snapshots.set(Math.floor(idx / SNAPSHOT_INTERVAL), idx)
        }

        // In live mode, cursor follows the latest entry
        if (s.mode === "live") {
          s.cursor = idx
        }
      }),
    )
  }

  function appendBatch(entries: TimelineEntry[]) {
    setState(
      produce((s) => {
        const startIdx = s.entries.length
        s.entries.push(...entries)

        for (let i = startIdx; i < s.entries.length; i++) {
          if (i % SNAPSHOT_INTERVAL === 0) {
            s.snapshots.set(Math.floor(i / SNAPSHOT_INTERVAL), i)
          }
        }

        if (s.mode === "live") {
          s.cursor = s.entries.length - 1
        }
      }),
    )
  }

  function setCursor(index: number) {
    setState(
      produce((s) => {
        s.cursor = Math.max(0, Math.min(index, s.entries.length - 1))
      }),
    )
  }

  function setMode(mode: TimelineMode) {
    setState(
      produce((s) => {
        s.mode = mode
        if (mode === "live") {
          s.cursor = Math.max(0, s.entries.length - 1)
        }
      }),
    )
  }

  function clear() {
    setState({
      entries: [],
      cursor: 0,
      mode: "live",
      snapshots: new Map(),
    })
  }

  return {
    state,
    append,
    appendBatch,
    setCursor,
    setMode,
    clear,
  }
}
