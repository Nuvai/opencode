import type { Actor, Category } from "@/pipeline/actor-model"
import { CATEGORY_COLORS } from "@/utils/color"
import { ACTOR_POSITIONS } from "./actor-positions"
import { getEdgePath } from "./edge-paths"
import { midpoint } from "@/utils/svg-math"

let pathIdCounter = 0

export function AnimatedEdge(props: { from: Actor; to: Actor; category: Category; label: string }) {
  const pathId = `edge-path-${pathIdCounter++}`
  const color = () => CATEGORY_COLORS[props.category]
  const path = () => getEdgePath(props.from, props.to)
  const mid = () => midpoint(ACTOR_POSITIONS[props.from], ACTOR_POSITIONS[props.to])

  return (
    <g>
      {/* Edge path */}
      <path
        id={pathId}
        d={path()}
        fill="none"
        stroke={color()}
        stroke-width={2}
        opacity={0.8}
      />

      {/* Animated particle */}
      <circle r={5} fill={color()} opacity={0.9}>
        <animateMotion dur="0.8s" fill="freeze" repeatCount="1">
          <mpath href={`#${pathId}`} />
        </animateMotion>
        <animate attributeName="r" values="5;8;5" dur="0.8s" fill="freeze" />
        <animate attributeName="opacity" values="1;1;0" dur="0.8s" fill="freeze" />
      </circle>

      {/* Glow trail on path */}
      <path
        d={path()}
        fill="none"
        stroke={color()}
        stroke-width={6}
        opacity={0.15}
        stroke-linecap="round"
      />

      {/* Label */}
      <text
        x={mid().x}
        y={mid().y - 10}
        text-anchor="middle"
        font-size="10"
        fill={color()}
        font-weight="500"
        class="font-mono"
      >
        {props.label}
      </text>
    </g>
  )
}
