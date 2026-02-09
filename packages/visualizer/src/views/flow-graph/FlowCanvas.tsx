import { For, Show, createMemo } from "solid-js"
import { useTimeline } from "@/context/timeline"
import { ACTORS, type Actor } from "@/pipeline/actor-model"
import { ACTOR_POSITIONS, VIEWBOX } from "./actor-positions"
import { ActorNode } from "./ActorNode"
import { AnimatedEdge } from "./AnimatedEdge"
import { EdgeTrail } from "./EdgeTrail"

export function FlowCanvas() {
  const tl = useTimeline()

  const actorCounts = createMemo(() => {
    const counts: Record<Actor, number> = { user: 0, system: 0, agent: 0, llm: 0, tool: 0 }
    for (const entry of tl.visibleEntries()) {
      counts[entry.from]++
      if (entry.from !== entry.to) counts[entry.to]++
    }
    return counts
  })

  const currentEntry = () => tl.currentEntry()
  const trailEntries = () => tl.recentEdges().slice(0, -1) // all except the latest

  return (
    <svg
      viewBox={`${VIEWBOX.x} ${VIEWBOX.y} ${VIEWBOX.width} ${VIEWBOX.height}`}
      class="w-full h-full"
      preserveAspectRatio="xMidYMid meet"
    >
      {/* Background grid */}
      <defs>
        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.03)" stroke-width="1" />
        </pattern>
      </defs>
      <rect width={VIEWBOX.width} height={VIEWBOX.height} fill="url(#grid)" />

      {/* Edge trails (fading ghosts) */}
      <EdgeTrail entries={trailEntries()} />

      {/* Current animated edge */}
      <Show when={currentEntry()}>
        {(entry) => (
          <AnimatedEdge
            from={entry().from}
            to={entry().to}
            category={entry().category}
            label={tl.displayMode() === "educational" ? entry().shortLabel : entry().label}
          />
        )}
      </Show>

      {/* Actor nodes */}
      <For each={ACTORS}>
        {(actor) => (
          <ActorNode
            actor={actor}
            x={ACTOR_POSITIONS[actor].x}
            y={ACTOR_POSITIONS[actor].y}
            active={tl.activeActors().has(actor)}
            eventCount={actorCounts()[actor]}
          />
        )}
      </For>
    </svg>
  )
}
