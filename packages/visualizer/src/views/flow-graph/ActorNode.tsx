import type { Actor } from "@/pipeline/actor-model"
import { ACTOR_COLORS } from "@/utils/color"
import { ACTOR_CONFIG } from "@/pipeline/actor-model"

const ACTOR_ICONS: Record<Actor, string> = {
  user: "👤",
  system: "⚙",
  agent: "🤖",
  llm: "🧠",
  tool: "🔧",
}

export function ActorNode(props: { actor: Actor; x: number; y: number; active: boolean; eventCount?: number }) {
  const color = () => ACTOR_COLORS[props.actor]
  const r = 32

  return (
    <g>
      {/* Background glow when active */}
      <circle
        cx={props.x}
        cy={props.y}
        r={r + 8}
        fill={color() + "11"}
        stroke="none"
        class={props.active ? "animate-actor-pulse" : ""}
        style={{ "--pulse-color": color() }}
      />

      {/* Main circle */}
      <circle
        cx={props.x}
        cy={props.y}
        r={r}
        fill={color() + "15"}
        stroke={color()}
        stroke-width={props.active ? 2.5 : 1.5}
        style={{ transition: "stroke-width 0.3s" }}
      />

      {/* Icon */}
      <text
        x={props.x}
        y={props.y + 2}
        text-anchor="middle"
        dominant-baseline="middle"
        font-size="20"
        fill={color()}
      >
        {ACTOR_ICONS[props.actor]}
      </text>

      {/* Label below */}
      <text
        x={props.x}
        y={props.y + r + 16}
        text-anchor="middle"
        font-size="12"
        fill={color()}
        font-weight="500"
        class="font-sans"
      >
        {ACTOR_CONFIG[props.actor].label}
      </text>

      {/* Event count badge */}
      {props.eventCount !== undefined && props.eventCount > 0 && (
        <g>
          <circle cx={props.x + r - 4} cy={props.y - r + 4} r={10} fill={color()} opacity={0.9} />
          <text
            x={props.x + r - 4}
            y={props.y - r + 4}
            text-anchor="middle"
            dominant-baseline="middle"
            font-size="8"
            fill="white"
            font-weight="bold"
            class="font-mono"
          >
            {props.eventCount > 99 ? "99+" : props.eventCount}
          </text>
        </g>
      )}
    </g>
  )
}
