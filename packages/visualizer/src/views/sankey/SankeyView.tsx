import { createMemo, For, Show } from "solid-js"
import { useTimeline } from "@/context/timeline"
import { ACTORS, ACTOR_CONFIG, type Actor } from "@/pipeline/actor-model"
import { ACTOR_COLORS, CATEGORY_COLORS } from "@/utils/color"
import type { TimelineEntry, Category } from "@/pipeline/actor-model"

type Flow = { from: Actor; to: Actor; count: number; dominantCategory: Category }

const NODE_WIDTH = 24
const NODE_PADDING = 20
const SVG_WIDTH = 700
const SVG_HEIGHT = 400

// Left and right column positions for Sankey layout
const LEFT_X = 80
const RIGHT_X = SVG_WIDTH - 80

// Actors on left (sources) and right (destinations)
const LEFT_ACTORS: Actor[] = ["user", "system", "agent", "llm", "tool"]
const RIGHT_ACTORS: Actor[] = ["user", "system", "agent", "llm", "tool"]

export function SankeyView() {
  const tl = useTimeline()

  const flows = createMemo((): Flow[] => {
    const entries = tl.visibleEntries()
    const flowMap = new Map<string, { count: number; categories: Map<Category, number> }>()

    for (const e of entries) {
      const key = `${e.from}→${e.to}`
      const existing = flowMap.get(key) || { count: 0, categories: new Map() }
      existing.count++
      existing.categories.set(e.category, (existing.categories.get(e.category) || 0) + 1)
      flowMap.set(key, existing)
    }

    return Array.from(flowMap.entries()).map(([key, data]) => {
      const [from, to] = key.split("→") as [Actor, Actor]
      let dominantCategory: Category = "control"
      let maxCount = 0
      for (const [cat, count] of data.categories) {
        if (count > maxCount) {
          maxCount = count
          dominantCategory = cat
        }
      }
      return { from, to, count: data.count, dominantCategory }
    }).sort((a, b) => b.count - a.count)
  })

  const totalFlows = createMemo(() => flows().reduce((s, f) => s + f.count, 0))

  // Compute actor totals for node heights
  const actorOutTotals = createMemo(() => {
    const totals: Record<Actor, number> = { user: 0, system: 0, agent: 0, llm: 0, tool: 0 }
    for (const f of flows()) totals[f.from] += f.count
    return totals
  })

  const actorInTotals = createMemo(() => {
    const totals: Record<Actor, number> = { user: 0, system: 0, agent: 0, llm: 0, tool: 0 }
    for (const f of flows()) totals[f.to] += f.count
    return totals
  })

  const maxTotal = createMemo(() => {
    const allTotals = [...Object.values(actorOutTotals()), ...Object.values(actorInTotals())]
    return Math.max(...allTotals, 1)
  })

  function nodeHeight(count: number): number {
    return Math.max(12, (count / maxTotal()) * (SVG_HEIGHT - 120))
  }

  function leftNodeY(actor: Actor): number {
    const idx = LEFT_ACTORS.indexOf(actor)
    let y = 40
    for (let i = 0; i < idx; i++) {
      y += nodeHeight(actorOutTotals()[LEFT_ACTORS[i]]) + NODE_PADDING
    }
    return y
  }

  function rightNodeY(actor: Actor): number {
    const idx = RIGHT_ACTORS.indexOf(actor)
    let y = 40
    for (let i = 0; i < idx; i++) {
      y += nodeHeight(actorInTotals()[RIGHT_ACTORS[i]]) + NODE_PADDING
    }
    return y
  }

  // Track offsets for stacking flows within each node
  function computeFlowPaths() {
    const leftOffsets: Record<Actor, number> = { user: 0, system: 0, agent: 0, llm: 0, tool: 0 }
    const rightOffsets: Record<Actor, number> = { user: 0, system: 0, agent: 0, llm: 0, tool: 0 }
    const total = totalFlows() || 1

    return flows().map((flow) => {
      const bandHeight = Math.max(2, (flow.count / maxTotal()) * (SVG_HEIGHT - 120))

      const sy = leftNodeY(flow.from) + leftOffsets[flow.from]
      leftOffsets[flow.from] += bandHeight

      const dy = rightNodeY(flow.to) + rightOffsets[flow.to]
      rightOffsets[flow.to] += bandHeight

      const x1 = LEFT_X + NODE_WIDTH
      const x2 = RIGHT_X
      const cx = (x1 + x2) / 2

      const path = `M ${x1} ${sy} C ${cx} ${sy}, ${cx} ${dy}, ${x2} ${dy} L ${x2} ${dy + bandHeight} C ${cx} ${dy + bandHeight}, ${cx} ${sy + bandHeight}, ${x1} ${sy + bandHeight} Z`

      return { flow, path, bandHeight, sy, dy }
    })
  }

  return (
    <div class="flex flex-col h-full">
      <div class="flex items-center gap-4 px-4 py-2 border-b border-gray-800 shrink-0">
        <span class="text-xs font-medium text-gray-300">Flow Volume</span>
        <span class="text-[10px] text-gray-500 font-mono">
          {totalFlows()} total events across {flows().length} flow paths
        </span>
      </div>

      <Show
        when={flows().length > 0}
        fallback={
          <div class="flex-1 flex items-center justify-center text-gray-600 text-sm">
            No flows yet — interact with OpenCode to see traffic patterns
          </div>
        }
      >
        <div class="flex-1 overflow-auto p-4">
          <svg viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`} class="w-full max-w-3xl mx-auto" preserveAspectRatio="xMidYMid meet">
            {/* Flow bands */}
            <For each={computeFlowPaths()}>
              {({ flow, path }) => (
                <path
                  d={path}
                  fill={CATEGORY_COLORS[flow.dominantCategory] + "33"}
                  stroke={CATEGORY_COLORS[flow.dominantCategory] + "66"}
                  stroke-width={0.5}
                >
                  <title>{`${ACTOR_CONFIG[flow.from].label} → ${ACTOR_CONFIG[flow.to].label}: ${flow.count} events`}</title>
                </path>
              )}
            </For>

            {/* Left nodes (sources) */}
            <For each={LEFT_ACTORS}>
              {(actor) => {
                const total = () => actorOutTotals()[actor]
                const h = () => nodeHeight(total())
                const y = () => leftNodeY(actor)
                return (
                  <Show when={total() > 0}>
                    <g>
                      <rect x={LEFT_X} y={y()} width={NODE_WIDTH} height={h()} fill={ACTOR_COLORS[actor]} rx={4} opacity={0.8} />
                      <text x={LEFT_X - 6} y={y() + h() / 2 + 4} text-anchor="end" font-size="11" fill={ACTOR_COLORS[actor]} font-weight="500" class="font-sans">
                        {ACTOR_CONFIG[actor].label}
                      </text>
                      <text x={LEFT_X - 6} y={y() + h() / 2 + 16} text-anchor="end" font-size="9" fill={ACTOR_COLORS[actor]} opacity={0.6} class="font-mono">
                        {total()}
                      </text>
                    </g>
                  </Show>
                )
              }}
            </For>

            {/* Right nodes (destinations) */}
            <For each={RIGHT_ACTORS}>
              {(actor) => {
                const total = () => actorInTotals()[actor]
                const h = () => nodeHeight(total())
                const y = () => rightNodeY(actor)
                return (
                  <Show when={total() > 0}>
                    <g>
                      <rect x={RIGHT_X} y={y()} width={NODE_WIDTH} height={h()} fill={ACTOR_COLORS[actor]} rx={4} opacity={0.8} />
                      <text x={RIGHT_X + NODE_WIDTH + 6} y={y() + h() / 2 + 4} text-anchor="start" font-size="11" fill={ACTOR_COLORS[actor]} font-weight="500" class="font-sans">
                        {ACTOR_CONFIG[actor].label}
                      </text>
                      <text x={RIGHT_X + NODE_WIDTH + 6} y={y() + h() / 2 + 16} text-anchor="start" font-size="9" fill={ACTOR_COLORS[actor]} opacity={0.6} class="font-mono">
                        {total()}
                      </text>
                    </g>
                  </Show>
                )
              }}
            </For>

            {/* Column headers */}
            <text x={LEFT_X + NODE_WIDTH / 2} y={24} text-anchor="middle" font-size="10" fill="#8b95a5" class="font-sans">Source</text>
            <text x={RIGHT_X + NODE_WIDTH / 2} y={24} text-anchor="middle" font-size="10" fill="#8b95a5" class="font-sans">Destination</text>
          </svg>
        </div>
      </Show>
    </div>
  )
}
