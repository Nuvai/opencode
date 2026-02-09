import { For, Show, createSignal, createResource } from "solid-js"
import { listRecordings, loadRecordingEvents, type RecordingMeta } from "@/store/recording-store"
import { useTimeline } from "@/context/timeline"
import { formatRelativeTime } from "@/utils/time-format"

export function RecordingSelector() {
  const tl = useTimeline()
  const [open, setOpen] = createSignal(false)
  const [recordings, { refetch }] = createResource(listRecordings)

  async function loadRecording(rec: RecordingMeta) {
    const events = await loadRecordingEvents(rec.id)
    tl.clear()
    tl.appendBatch(events)
    tl.setMode("paused")
    tl.setCursor(0)
    setOpen(false)
  }

  return (
    <div class="relative">
      <button
        class="text-[10px] text-gray-500 hover:text-gray-300 px-1.5 py-0.5 rounded border border-gray-700 hover:border-gray-600"
        onClick={() => { setOpen(!open()); if (!open()) refetch() }}
      >
        Recordings
      </button>

      <Show when={open()}>
        <div class="absolute bottom-full mb-1 right-0 w-64 bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-50 p-2 max-h-48 overflow-y-auto">
          <Show when={!recordings.loading && recordings()?.length === 0}>
            <div class="text-[10px] text-gray-600 text-center py-2">No recordings yet</div>
          </Show>
          <For each={recordings()}>
            {(rec) => (
              <button
                class="w-full text-left px-2 py-1.5 rounded hover:bg-gray-800 transition-colors"
                onClick={() => loadRecording(rec)}
              >
                <div class="text-[10px] text-gray-300 font-mono">{rec.id}</div>
                <div class="text-[9px] text-gray-500">
                  {rec.eventCount} events · {rec.sessionIDs.length} session(s) · {formatRelativeTime(rec.startTime)}
                </div>
              </button>
            )}
          </For>
        </div>
      </Show>
    </div>
  )
}
