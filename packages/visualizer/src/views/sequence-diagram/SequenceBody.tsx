import { Show, createMemo, createEffect } from "solid-js"
import { VList, type VListHandle } from "virtua/solid"
import { useTimeline } from "@/context/timeline"
import { useConnection } from "@/context/connection"
import { SequenceRow } from "./SequenceRow"
import { TimeGap } from "./TimeGap"
import type { TimelineEntry } from "@/pipeline/actor-model"

const GAP_THRESHOLD_MS = 1000

type RowItem =
  | { type: "entry"; entry: TimelineEntry; isLatest: boolean }
  | { type: "gap"; gapMs: number }

export function SequenceBody() {
  const tl = useTimeline()
  const conn = useConnection()
  let listRef: VListHandle | undefined

  const items = createMemo((): RowItem[] => {
    const entries = tl.visibleEntries()
    const result: RowItem[] = []

    for (let i = 0; i < entries.length; i++) {
      if (i > 0) {
        const gap = entries[i].timestamp - entries[i - 1].timestamp
        if (gap >= GAP_THRESHOLD_MS) {
          result.push({ type: "gap", gapMs: gap })
        }
      }
      result.push({
        type: "entry",
        entry: entries[i],
        isLatest: i === entries.length - 1,
      })
    }
    return result
  })

  // Auto-scroll to bottom in live mode
  createEffect(() => {
    const count = items().length
    if (count > 0 && tl.state.mode === "live" && listRef) {
      requestAnimationFrame(() => {
        listRef!.scrollToIndex(count - 1, { align: "end" })
      })
    }
  })

  return (
    <div class="flex-1 overflow-hidden">
      <Show
        when={items().length > 0}
        fallback={
          <div class="flex items-center justify-center h-full text-gray-600 text-sm">
            <div class="text-center">
              <Show when={conn.state() === "waiting" || conn.state() === "connecting"}>
                <div class="text-2xl mb-2 animate-live-pulse">📡</div>
                <div>Waiting for OpenCode server...</div>
                <div class="text-xs text-gray-700 mt-1">
                  {conn.stateDetail() || `Trying ${conn.serverUrl()}`}
                </div>
                <div class="text-[10px] text-gray-800 mt-2">The visualizer will connect automatically when the server starts</div>
              </Show>
              <Show when={conn.state() === "connected"}>
                <div class="text-2xl mb-2">📡</div>
                <div>Connected — waiting for events...</div>
                <div class="text-xs text-gray-700 mt-1">Send a message in OpenCode to see events flow</div>
              </Show>
              <Show when={conn.state() === "disconnected"}>
                <div class="text-2xl mb-2">📡</div>
                <div>Disconnected</div>
                <div class="text-xs text-gray-700 mt-1">Click Connect or load a recording to get started</div>
              </Show>
              <Show when={conn.state() === "error"}>
                <div class="text-2xl mb-2">⚠</div>
                <div class="text-red-400">Connection error</div>
                <div class="text-xs text-gray-700 mt-1">{conn.stateDetail()}</div>
              </Show>
            </div>
          </div>
        }
      >
        <VList
          ref={listRef}
          data={items()}
          overscan={10}
          style={{ height: "100%" }}
        >
          {(item) => (
            <Show
              when={item.type === "entry"}
              fallback={<TimeGap gapMs={(item as { type: "gap"; gapMs: number }).gapMs} />}
            >
              <SequenceRow
                entry={(item as { type: "entry"; entry: TimelineEntry; isLatest: boolean }).entry}
                isLatest={(item as { type: "entry"; entry: TimelineEntry; isLatest: boolean }).isLatest}
              />
            </Show>
          )}
        </VList>
      </Show>
    </div>
  )
}
