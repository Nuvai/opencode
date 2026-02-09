import { For } from "solid-js"
import { CATEGORY_CONFIG, type Category } from "@/pipeline/actor-model"
import { CATEGORY_COLORS } from "@/utils/color"

const CATEGORIES: Category[] = ["message", "tool", "token", "control", "error", "permission"]

export function FlowLegend() {
  return (
    <div class="absolute bottom-3 left-3 flex gap-3 bg-gray-950/80 backdrop-blur-sm rounded px-3 py-1.5 border border-gray-800">
      <For each={CATEGORIES}>
        {(cat) => (
          <div class="flex items-center gap-1">
            <div
              class="w-2.5 h-2.5 rounded-full"
              style={{ "background-color": CATEGORY_COLORS[cat] }}
            />
            <span class="text-[10px] text-gray-400">{CATEGORY_CONFIG[cat].label}</span>
          </div>
        )}
      </For>
    </div>
  )
}
