import type { Actor } from "@/pipeline/actor-model"
import { ACTOR_COLORS } from "@/utils/color"

const ACTOR_ICONS: Record<Actor, string> = {
  user: "👤",
  system: "⚙",
  agent: "🤖",
  llm: "🧠",
  tool: "🔧",
}

const ACTOR_LABELS: Record<Actor, string> = {
  user: "User",
  system: "System",
  agent: "Agent",
  llm: "LLM",
  tool: "Tools",
}

export function ActorIcon(props: { actor: Actor; size?: "sm" | "md" | "lg"; active?: boolean }) {
  const sizeClass = () => {
    switch (props.size || "md") {
      case "sm": return "w-6 h-6 text-xs"
      case "md": return "w-8 h-8 text-sm"
      case "lg": return "w-12 h-12 text-base"
    }
  }

  return (
    <div
      class={`${sizeClass()} rounded-full flex items-center justify-center font-mono font-bold ${props.active ? "animate-actor-pulse" : ""}`}
      style={{
        "background-color": ACTOR_COLORS[props.actor] + "22",
        "border": `2px solid ${ACTOR_COLORS[props.actor]}`,
        "--pulse-color": ACTOR_COLORS[props.actor],
        color: ACTOR_COLORS[props.actor],
      }}
      title={ACTOR_LABELS[props.actor]}
    >
      {ACTOR_ICONS[props.actor]}
    </div>
  )
}
