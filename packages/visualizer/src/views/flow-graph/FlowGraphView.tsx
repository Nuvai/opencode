import { Show } from "solid-js"
import { FlowCanvas } from "./FlowCanvas"
import { FlowLegend } from "./FlowLegend"
import { useTimeline } from "@/context/timeline"
import { formatTimestamp } from "@/utils/time-format"
import { CategoryBadge } from "@/components/CategoryBadge"

export function FlowGraphView() {
  const tl = useTimeline()

  return (
    <div class="flex flex-col h-full relative">
      <div class="flex-1 min-h-0">
        <FlowCanvas />
      </div>

      {/* Current event info overlay */}
      <Show when={tl.currentEntry()}>
        {(entry) => (
          <div class="absolute top-3 left-3 right-3 flex items-center gap-3 bg-gray-950/80 backdrop-blur-sm rounded-lg px-4 py-2 border border-gray-800">
            <CategoryBadge category={entry().category} />
            <span class="text-xs text-gray-400 font-mono">{formatTimestamp(entry().timestamp)}</span>
            <span class="text-xs text-gray-200">
              {tl.displayMode() === "educational" ? entry().label : entry().label}
            </span>
            <span class="text-[10px] text-gray-600 ml-auto font-mono">#{entry().sequenceIndex}</span>
          </div>
        )}
      </Show>

      <FlowLegend />
    </div>
  )
}
