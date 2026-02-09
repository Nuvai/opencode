import { Show, createSignal } from "solid-js"
import type { TimelineEntry } from "@/pipeline/actor-model"
import { ArrowLine } from "./ArrowLine"
import { RowDetail } from "./RowDetail"
import { formatTimestamp } from "@/utils/time-format"
import { useTimeline } from "@/context/timeline"
import { categoryBorderClass } from "@/utils/color"

export function SequenceRow(props: { entry: TimelineEntry; isLatest: boolean }) {
  const tl = useTimeline()
  const [expanded, setExpanded] = createSignal(false)
  const isDebug = () => tl.displayMode() === "debug"
  const label = () => isDebug() ? props.entry.label : props.entry.shortLabel

  return (
    <div class={`border-b border-gray-800/50 ${props.isLatest ? "bg-gray-800/30" : ""} animate-row-enter`}>
      <div
        class="flex items-center cursor-pointer hover:bg-gray-800/40 transition-colors"
        style={{ height: "36px" }}
        onClick={() => setExpanded(!expanded())}
      >
        {/* Timestamp */}
        <div class="w-20 shrink-0 px-2 text-[10px] text-gray-600 font-mono">
          {formatTimestamp(props.entry.timestamp)}
        </div>

        {/* Arrow area */}
        <div class="flex-1 relative" style={{ height: "36px" }}>
          <ArrowLine
            from={props.entry.from}
            to={props.entry.to}
            category={props.entry.category}
            label={label()}
            isLatest={props.isLatest}
          />
        </div>
      </div>

      <Show when={expanded() && isDebug()}>
        <RowDetail entry={props.entry} />
      </Show>
    </div>
  )
}
