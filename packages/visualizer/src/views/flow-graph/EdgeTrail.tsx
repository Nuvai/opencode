import { For } from "solid-js"
import type { TimelineEntry } from "@/pipeline/actor-model"
import { CATEGORY_COLORS } from "@/utils/color"
import { getEdgePath } from "./edge-paths"
import { midpoint } from "@/utils/svg-math"
import { ACTOR_POSITIONS } from "./actor-positions"

export function EdgeTrail(props: { entries: TimelineEntry[] }) {
  return (
    <For each={props.entries}>
      {(entry, i) => {
        const age = () => props.entries.length - i()
        const opacity = () => Math.max(0.05, 0.3 - age() * 0.04)
        const path = () => getEdgePath(entry.from, entry.to)
        const color = () => CATEGORY_COLORS[entry.category]

        return (
          <path
            d={path()}
            fill="none"
            stroke={color()}
            stroke-width={1.5}
            opacity={opacity()}
            stroke-linecap="round"
          />
        )
      }}
    </For>
  )
}
