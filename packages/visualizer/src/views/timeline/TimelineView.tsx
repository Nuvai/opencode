import { createMemo, For, Show } from "solid-js"
import { useTimeline } from "@/context/timeline"
import { ACTORS, ACTOR_CONFIG, type Actor } from "@/pipeline/actor-model"
import type { TimelineEntry } from "@/pipeline/actor-model"
import { ACTOR_COLORS, CATEGORY_COLORS } from "@/utils/color"
import { formatTimestamp, formatDuration } from "@/utils/time-format"

type Span = {
  id: string
  actor: Actor
  label: string
  category: string
  startTime: number
  endTime: number
  entry: TimelineEntry
}

/** Extracts duration spans from timeline entries (tool calls, LLM steps) */
function extractSpans(entries: TimelineEntry[]): Span[] {
  const spans: Span[] = []
  const openSpans = new Map<string, { startEntry: TimelineEntry; actor: Actor }>()

  for (const entry of entries) {
    // Tool calls: pending → completed/error
    if (entry.category === "tool" && entry.metadata?.toolName) {
      const key = `tool:${entry.partID}`
      if (entry.from === "agent" && entry.to === "tool") {
        openSpans.set(key, { startEntry: entry, actor: "tool" })
      } else if (entry.from === "tool" && entry.to === "agent") {
        const open = openSpans.get(key)
        if (open) {
          spans.push({
            id: entry.id,
            actor: "tool",
            label: entry.metadata.toolName,
            category: entry.category,
            startTime: open.startEntry.timestamp,
            endTime: entry.timestamp,
            entry,
          })
          openSpans.delete(key)
        }
      }
    }

    // LLM steps: step-start → step-finish
    if (entry.shortLabel === "Step→") {
      openSpans.set(`step:${entry.messageID}`, { startEntry: entry, actor: "llm" })
    }
    if (entry.shortLabel === "←Step") {
      const key = `step:${entry.messageID}`
      const open = openSpans.get(key)
      if (open) {
        spans.push({
          id: entry.id,
          actor: "llm",
          label: `LLM Step (${entry.metadata?.tokens ? `${entry.metadata.tokens.input + entry.metadata.tokens.output} tok` : ""})`,
          category: "control",
          startTime: open.startEntry.timestamp,
          endTime: entry.timestamp,
          entry,
        })
        openSpans.delete(key)
      }
    }

    // Session busy → idle
    if (entry.metadata?.status === "busy") {
      openSpans.set(`session:${entry.sessionID}`, { startEntry: entry, actor: "agent" })
    }
    if (entry.metadata?.status === "idle") {
      const key = `session:${entry.sessionID}`
      const open = openSpans.get(key)
      if (open) {
        spans.push({
          id: entry.id,
          actor: "agent",
          label: "Agent Active",
          category: "control",
          startTime: open.startEntry.timestamp,
          endTime: entry.timestamp,
          entry,
        })
        openSpans.delete(key)
      }
    }

    // Instantaneous events as thin bars
    if (!["tool", "control"].includes(entry.category) || !entry.partID) {
      if (entry.category === "message" || entry.category === "permission" || entry.category === "error") {
        spans.push({
          id: entry.id,
          actor: entry.from,
          label: entry.shortLabel,
          category: entry.category,
          startTime: entry.timestamp,
          endTime: entry.timestamp + 50, // thin bar
          entry,
        })
      }
    }
  }

  return spans
}

const LANE_HEIGHT = 40
const LANE_GAP = 4
const LANE_ACTORS: Actor[] = ["user", "agent", "llm", "tool", "system"]

export function TimelineView() {
  const tl = useTimeline()

  const spans = createMemo(() => extractSpans(tl.visibleEntries()))

  const timeRange = createMemo(() => {
    const entries = tl.visibleEntries()
    if (entries.length === 0) return { start: 0, end: 1 }
    return { start: entries[0].timestamp, end: entries[entries.length - 1].timestamp + 100 }
  })

  const totalWidth = 2000 // SVG internal width
  const totalHeight = () => LANE_ACTORS.length * (LANE_HEIGHT + LANE_GAP) + 60

  function timeToX(ts: number): number {
    const { start, end } = timeRange()
    const duration = end - start
    if (duration <= 0) return 0
    return ((ts - start) / duration) * (totalWidth - 120) + 100
  }

  return (
    <div class="flex flex-col h-full">
      {/* Header */}
      <div class="flex items-center gap-4 px-4 py-2 border-b border-gray-800 shrink-0">
        <span class="text-xs font-medium text-gray-300">Timeline</span>
        <span class="text-[10px] text-gray-500 font-mono">
          {spans().length} spans · {formatDuration(timeRange().end - timeRange().start)} total
        </span>
      </div>

      <Show
        when={spans().length > 0}
        fallback={
          <div class="flex-1 flex items-center justify-center text-gray-600 text-sm">
            No duration spans yet — interact with OpenCode to see activity bars
          </div>
        }
      >
        <div class="flex-1 overflow-auto">
          <svg
            viewBox={`0 0 ${totalWidth} ${totalHeight()}`}
            class="w-full min-w-[800px]"
            style={{ height: `${totalHeight()}px`, "min-height": "300px" }}
            preserveAspectRatio="xMinYMin meet"
          >
            {/* Lane labels + backgrounds */}
            <For each={LANE_ACTORS}>
              {(actor, i) => {
                const y = () => i() * (LANE_HEIGHT + LANE_GAP) + 30
                return (
                  <g>
                    <rect x={0} y={y()} width={totalWidth} height={LANE_HEIGHT} fill={ACTOR_COLORS[actor] + "08"} rx={4} />
                    <text x={8} y={y() + LANE_HEIGHT / 2 + 4} font-size="10" fill={ACTOR_COLORS[actor]} font-weight="500" class="font-sans">
                      {ACTOR_CONFIG[actor].label}
                    </text>
                  </g>
                )
              }}
            </For>

            {/* Spans as bars */}
            <For each={spans()}>
              {(span) => {
                const laneIdx = () => LANE_ACTORS.indexOf(span.actor)
                if (laneIdx() === -1) return null
                const y = () => laneIdx() * (LANE_HEIGHT + LANE_GAP) + 30 + 6
                const x1 = () => timeToX(span.startTime)
                const x2 = () => timeToX(span.endTime)
                const barWidth = () => Math.max(3, x2() - x1())
                const color = () => CATEGORY_COLORS[span.category as keyof typeof CATEGORY_COLORS] || ACTOR_COLORS[span.actor]

                return (
                  <g>
                    <rect
                      x={x1()}
                      y={y()}
                      width={barWidth()}
                      height={LANE_HEIGHT - 12}
                      fill={color() + "44"}
                      stroke={color()}
                      stroke-width={1}
                      rx={3}
                      class="cursor-pointer"
                      onClick={() => tl.setSelectedEntry(span.entry)}
                    >
                      <title>{`${span.label}\n${formatDuration(span.endTime - span.startTime)}\n${formatTimestamp(span.startTime)}`}</title>
                    </rect>
                    <Show when={barWidth() > 40}>
                      <text
                        x={x1() + 4}
                        y={y() + (LANE_HEIGHT - 12) / 2 + 3}
                        font-size="9"
                        fill={color()}
                        class="font-mono"
                        clip-path={`inset(0 0 0 0)`}
                      >
                        {span.label}
                      </text>
                    </Show>
                  </g>
                )
              }}
            </For>

            {/* Time axis */}
            <line x1={100} y1={totalHeight() - 20} x2={totalWidth - 20} y2={totalHeight() - 20} stroke="#374151" stroke-width={1} />
          </svg>
        </div>
      </Show>
    </div>
  )
}
