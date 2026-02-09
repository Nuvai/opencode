import type { RecordingMeta } from "@/store/recording-store"
import { formatRelativeTime, formatDuration } from "@/utils/time-format"

export function RecordingCard(props: {
  recording: RecordingMeta
  onLoad: () => void
  onDelete: () => void
  onExport: () => void
}) {
  const rec = () => props.recording
  const duration = () => rec().endTime > 0 ? rec().endTime - rec().startTime : 0

  return (
    <div class="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg border border-gray-800 hover:border-gray-700 transition-colors">
      <div class="min-w-0">
        <div class="text-xs text-gray-200 font-mono truncate">{rec().id}</div>
        <div class="flex items-center gap-3 mt-1 text-[10px] text-gray-500">
          <span>{rec().eventCount} events</span>
          <span>{rec().sessionIDs.length} session(s)</span>
          <span>{duration() > 0 ? formatDuration(duration()) : "..."}</span>
          <span>{formatRelativeTime(rec().startTime)}</span>
        </div>
      </div>
      <div class="flex items-center gap-1.5 shrink-0 ml-3">
        <button
          class="px-2 py-0.5 text-[10px] rounded bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors"
          onClick={props.onLoad}
        >
          Load
        </button>
        <button
          class="px-2 py-0.5 text-[10px] rounded bg-gray-700 text-gray-300 hover:bg-gray-600 transition-colors"
          onClick={props.onExport}
        >
          Export
        </button>
        <button
          class="px-2 py-0.5 text-[10px] rounded bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
          onClick={props.onDelete}
        >
          Delete
        </button>
      </div>
    </div>
  )
}
