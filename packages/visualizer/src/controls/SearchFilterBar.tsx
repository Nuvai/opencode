import { For, Show, createMemo } from "solid-js"
import { useTimeline } from "@/context/timeline"
import { CATEGORY_CONFIG, type Category } from "@/pipeline/actor-model"
import { CATEGORY_COLORS } from "@/utils/color"

const CATEGORIES = Object.keys(CATEGORY_CONFIG) as Category[]

export function SearchFilterBar() {
  const tl = useTimeline()

  const toolNames = createMemo(() => {
    const names = new Set<string>()
    for (const e of tl.state.entries) {
      if (e.metadata?.toolName) names.add(e.metadata.toolName)
    }
    return Array.from(names).sort()
  })

  const hasActiveFilter = () =>
    tl.searchQuery() !== "" || tl.categoryFilter() !== null || tl.actorFilter() !== null || tl.toolNameFilter() !== null

  const clearAll = () => {
    tl.setSearchQuery("")
    tl.setCategoryFilter(null)
    tl.setActorFilter(null)
    tl.setToolNameFilter(null)
  }

  return (
    <div class="flex items-center gap-2 px-3 py-1.5 border-b border-gray-800 bg-gray-950/60 shrink-0 overflow-x-auto">
      {/* Search input */}
      <input
        data-search-input
        type="text"
        placeholder="Search events..."
        value={tl.searchQuery()}
        onInput={(e) => tl.setSearchQuery(e.currentTarget.value)}
        class="w-40 bg-gray-900/80 border border-gray-800 rounded px-2 py-1 text-[10px] text-gray-300 placeholder:text-gray-700 focus:border-gray-600 focus:outline-none font-mono"
      />

      {/* Category chips */}
      <div class="flex items-center gap-1">
        <For each={CATEGORIES}>
          {(cat) => {
            const active = () => tl.categoryFilter() === cat
            const color = CATEGORY_COLORS[cat]
            return (
              <button
                class="px-1.5 py-0.5 rounded text-[9px] font-medium transition-colors border"
                style={{
                  "border-color": active() ? color : "transparent",
                  color: active() ? color : "#596373",
                  "background-color": active() ? color + "15" : "transparent",
                }}
                onClick={() => tl.setCategoryFilter(active() ? null : cat)}
              >
                {CATEGORY_CONFIG[cat].label}
              </button>
            )
          }}
        </For>
      </div>

      {/* Tool dropdown */}
      <Show when={toolNames().length > 0}>
        <select
          class="bg-gray-900/80 border border-gray-800 rounded px-1.5 py-0.5 text-[10px] text-gray-400 focus:border-gray-600 focus:outline-none font-mono"
          value={tl.toolNameFilter() || ""}
          onChange={(e) => tl.setToolNameFilter(e.currentTarget.value || null)}
        >
          <option value="">All tools</option>
          <For each={toolNames()}>
            {(name) => <option value={name}>{name}</option>}
          </For>
        </select>
      </Show>

      {/* Clear button */}
      <Show when={hasActiveFilter()}>
        <button
          class="text-[9px] text-gray-500 hover:text-gray-300 px-1.5 py-0.5 rounded border border-gray-800 hover:border-gray-600 transition-colors"
          onClick={clearAll}
        >
          Clear
        </button>
      </Show>

      {/* Result count */}
      <span class="text-[9px] text-gray-600 font-mono ml-auto shrink-0">
        {tl.filteredEntries().length}/{tl.state.entries.length}
      </span>
    </div>
  )
}
