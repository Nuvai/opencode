import { For } from "solid-js"
import { useTimeline } from "@/context/timeline"
import type { ActiveView } from "@/store/playback-store"

const VIEWS: { id: ActiveView; label: string }[] = [
  { id: "sequence", label: "Sequence" },
  { id: "flow", label: "Flow" },
  { id: "conversation", label: "Chat" },
  { id: "timeline", label: "Timeline" },
  { id: "stats", label: "Stats" },
  { id: "sankey", label: "Sankey" },
]

export function ViewToggle() {
  const tl = useTimeline()

  return (
    <div class="flex items-center bg-gray-800/50 rounded overflow-hidden">
      <For each={VIEWS}>
        {(view) => (
          <button
            class="px-2 py-0.5 text-[10px] font-medium transition-colors"
            classList={{
              "bg-purple-500/20 text-purple-400": tl.activeView() === view.id,
              "text-gray-500 hover:text-gray-300": tl.activeView() !== view.id,
            }}
            onClick={() => tl.setActiveView(view.id)}
          >
            {view.label}
          </button>
        )}
      </For>
    </div>
  )
}
