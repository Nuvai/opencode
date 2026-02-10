import { createMemo, For, Show } from "solid-js"
import { useTimeline } from "@/context/timeline"
import type { TimelineEntry, Actor, Category } from "@/pipeline/actor-model"
import { ACTOR_COLORS, CATEGORY_COLORS } from "@/utils/color"
import { ACTOR_CONFIG, CATEGORY_CONFIG } from "@/pipeline/actor-model"
import { formatDuration } from "@/utils/time-format"

function StatCard(props: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div class="bg-gray-800/50 rounded-lg border border-gray-800 p-3">
      <div class="text-[10px] text-gray-500 uppercase tracking-wider mb-1">{props.label}</div>
      <div class="text-xl font-semibold font-mono" style={{ color: props.color || "#e5e7eb" }}>
        {typeof props.value === "number" ? props.value.toLocaleString() : props.value}
      </div>
      <Show when={props.sub}>
        <div class="text-[10px] text-gray-500 mt-0.5">{props.sub}</div>
      </Show>
    </div>
  )
}

function BarChart(props: { items: { label: string; value: number; color: string }[]; maxValue?: number }) {
  const max = () => props.maxValue || Math.max(...props.items.map((i) => i.value), 1)
  return (
    <div class="space-y-1.5">
      <For each={props.items}>
        {(item) => (
          <div class="flex items-center gap-2">
            <span class="text-[10px] text-gray-400 w-20 text-right truncate font-mono">{item.label}</span>
            <div class="flex-1 h-4 bg-gray-900 rounded overflow-hidden">
              <div
                class="h-full rounded transition-all duration-300"
                style={{
                  width: `${(item.value / max()) * 100}%`,
                  "background-color": item.color + "66",
                  "border-right": `2px solid ${item.color}`,
                  "min-width": item.value > 0 ? "2px" : "0",
                }}
              />
            </div>
            <span class="text-[10px] text-gray-400 w-12 font-mono">{item.value}</span>
          </div>
        )}
      </For>
    </div>
  )
}

export function StatsView() {
  const tl = useTimeline()

  const stats = createMemo(() => {
    const entries = tl.visibleEntries()
    let totalTokensIn = 0
    let totalTokensOut = 0
    let totalTokensReasoning = 0
    let totalCost = 0
    let errorCount = 0
    const toolCalls = new Map<string, { count: number; totalDuration: number }>()
    const categoryCounts: Record<Category, number> = { message: 0, tool: 0, token: 0, control: 0, error: 0, permission: 0 }
    const actorCounts: Record<Actor, number> = { user: 0, system: 0, agent: 0, llm: 0, tool: 0 }
    let llmSteps = 0
    let sessionDuration = 0

    if (entries.length > 1) {
      sessionDuration = entries[entries.length - 1].timestamp - entries[0].timestamp
    }

    for (const e of entries) {
      categoryCounts[e.category]++
      actorCounts[e.from]++
      if (e.from !== e.to) actorCounts[e.to]++

      if (e.category === "error") errorCount++
      if (e.shortLabel === "←Step") llmSteps++

      if (e.metadata?.tokens) {
        totalTokensIn += e.metadata.tokens.input
        totalTokensOut += e.metadata.tokens.output
        totalTokensReasoning += e.metadata.tokens.reasoning
      }
      if (e.metadata?.cost) totalCost += e.metadata.cost

      if (e.metadata?.toolName) {
        const name = e.metadata.toolName
        const existing = toolCalls.get(name) || { count: 0, totalDuration: 0 }
        existing.count++
        if (e.metadata.duration) existing.totalDuration += e.metadata.duration
        toolCalls.set(name, existing)
      }
    }

    const toolItems = Array.from(toolCalls.entries())
      .map(([name, data]) => ({ name, ...data, avgDuration: data.count > 0 ? data.totalDuration / data.count : 0 }))
      .sort((a, b) => b.count - a.count)

    return {
      totalEvents: entries.length,
      totalTokensIn,
      totalTokensOut,
      totalTokensReasoning,
      totalTokens: totalTokensIn + totalTokensOut + totalTokensReasoning,
      totalCost,
      errorCount,
      llmSteps,
      sessionDuration,
      categoryCounts,
      actorCounts,
      toolItems,
    }
  })

  return (
    <div class="flex flex-col h-full overflow-y-auto p-4 gap-4">
      {/* Top metrics */}
      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard label="Events" value={stats().totalEvents} />
        <StatCard label="Total Tokens" value={stats().totalTokens} sub={`in: ${stats().totalTokensIn.toLocaleString()} · out: ${stats().totalTokensOut.toLocaleString()}`} color="#60a5fa" />
        <StatCard label="Cost" value={stats().totalCost > 0 ? `$${stats().totalCost.toFixed(4)}` : "$0"} color="#facc15" />
        <StatCard label="LLM Steps" value={stats().llmSteps} color="#c084fc" />
        <StatCard label="Errors" value={stats().errorCount} color={stats().errorCount > 0 ? "#ef4444" : "#4ade80"} />
        <StatCard label="Duration" value={formatDuration(stats().sessionDuration)} />
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Category breakdown */}
        <div class="bg-gray-800/30 rounded-lg border border-gray-800 p-3">
          <div class="text-xs font-medium text-gray-300 mb-3">Events by Category</div>
          <BarChart
            items={
              (Object.entries(stats().categoryCounts) as [Category, number][])
                .filter(([, v]) => v > 0)
                .map(([cat, count]) => ({
                  label: CATEGORY_CONFIG[cat].label,
                  value: count,
                  color: CATEGORY_COLORS[cat],
                }))
            }
          />
        </div>

        {/* Actor breakdown */}
        <div class="bg-gray-800/30 rounded-lg border border-gray-800 p-3">
          <div class="text-xs font-medium text-gray-300 mb-3">Activity by Actor</div>
          <BarChart
            items={
              (Object.entries(stats().actorCounts) as [Actor, number][])
                .filter(([, v]) => v > 0)
                .map(([actor, count]) => ({
                  label: ACTOR_CONFIG[actor].label,
                  value: count,
                  color: ACTOR_COLORS[actor],
                }))
            }
          />
        </div>

        {/* Tool breakdown */}
        <div class="bg-gray-800/30 rounded-lg border border-gray-800 p-3 lg:col-span-2">
          <div class="text-xs font-medium text-gray-300 mb-3">Tool Calls</div>
          <Show
            when={stats().toolItems.length > 0}
            fallback={<div class="text-[10px] text-gray-600">No tool calls yet</div>}
          >
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
              <For each={stats().toolItems}>
                {(tool) => (
                  <div class="flex items-center justify-between py-1 border-b border-gray-800/50">
                    <span class="text-[11px] text-cyan-400 font-mono truncate">{tool.name}</span>
                    <div class="flex items-center gap-3 text-[10px] text-gray-500 font-mono shrink-0">
                      <span>{tool.count}x</span>
                      <Show when={tool.avgDuration > 0}>
                        <span>avg {formatDuration(tool.avgDuration)}</span>
                      </Show>
                    </div>
                  </div>
                )}
              </For>
            </div>
          </Show>
        </div>
      </div>
    </div>
  )
}
