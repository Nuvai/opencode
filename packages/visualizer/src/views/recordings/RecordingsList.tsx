import { For, Show, createResource, createSignal } from "solid-js"
import {
  listRecordings,
  loadRecordingEvents,
  deleteRecording,
  exportRecording,
  importRecording,
} from "@/store/recording-store"
import { RecordingCard } from "./RecordingCard"
import { useTimeline } from "@/context/timeline"

export function RecordingsList(props: { onClose: () => void }) {
  const tl = useTimeline()
  const [recordings, { refetch }] = createResource(listRecordings)
  const [importing, setImporting] = createSignal(false)

  async function handleLoad(recId: string) {
    const events = await loadRecordingEvents(recId)
    tl.clear()
    tl.appendBatch(events)
    tl.setMode("paused")
    tl.setCursor(0)
    props.onClose()
  }

  async function handleDelete(recId: string) {
    await deleteRecording(recId)
    refetch()
  }

  async function handleExport(recId: string) {
    const json = await exportRecording(recId)
    const blob = new Blob([json], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${recId}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleImport() {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = ".json"
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return
      setImporting(true)
      try {
        const text = await file.text()
        await importRecording(text)
        refetch()
      } catch (err) {
        console.error("Import failed:", err)
      } finally {
        setImporting(false)
      }
    }
    input.click()
  }

  return (
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div class="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl w-full max-w-lg max-h-[70vh] flex flex-col">
        {/* Header */}
        <div class="flex items-center justify-between px-4 py-3 border-b border-gray-800">
          <h2 class="text-sm font-semibold text-gray-200">Recordings</h2>
          <div class="flex items-center gap-2">
            <button
              class="text-[10px] px-2 py-0.5 rounded border border-gray-700 text-gray-300 hover:border-gray-600"
              onClick={handleImport}
              disabled={importing()}
            >
              {importing() ? "Importing..." : "Import JSON"}
            </button>
            <button
              class="text-gray-500 hover:text-gray-300 text-sm"
              onClick={props.onClose}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Body */}
        <div class="flex-1 overflow-y-auto p-3 space-y-2">
          <Show when={recordings.loading}>
            <div class="text-center text-gray-600 text-xs py-8">Loading...</div>
          </Show>
          <Show when={!recordings.loading && recordings()?.length === 0}>
            <div class="text-center text-gray-600 text-xs py-8">
              <div class="text-2xl mb-2">📼</div>
              <div>No recordings yet</div>
              <div class="text-[10px] mt-1">Connect to a server and events will be recorded automatically</div>
            </div>
          </Show>
          <For each={recordings()}>
            {(rec) => (
              <RecordingCard
                recording={rec}
                onLoad={() => handleLoad(rec.id)}
                onDelete={() => handleDelete(rec.id)}
                onExport={() => handleExport(rec.id)}
              />
            )}
          </For>
        </div>
      </div>
    </div>
  )
}
