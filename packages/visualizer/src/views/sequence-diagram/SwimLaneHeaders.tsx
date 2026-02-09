import { For } from "solid-js"
import { ACTORS, ACTOR_CONFIG, type Actor } from "@/pipeline/actor-model"
import { ACTOR_COLORS } from "@/utils/color"
import { ActorIcon } from "@/components/ActorIcon"
import { useTimeline } from "@/context/timeline"

export const COLUMN_WIDTH = 160
export const ACTOR_COLUMNS: Record<Actor, number> = {
  user: 0,
  system: 1,
  agent: 2,
  llm: 3,
  tool: 4,
}

export function columnX(actor: Actor): number {
  return ACTOR_COLUMNS[actor] * COLUMN_WIDTH + COLUMN_WIDTH / 2
}

export function SwimLaneHeaders() {
  const tl = useTimeline()

  return (
    <div class="flex border-b border-gray-800 bg-gray-950/90 backdrop-blur-sm shrink-0">
      {/* Timestamp column */}
      <div class="w-20 shrink-0 px-2 py-2 text-[10px] text-gray-600 font-mono">
        Time
      </div>
      <For each={ACTORS}>
        {(actor) => (
          <div
            class="flex items-center gap-1.5 py-2 px-2"
            style={{ width: `${COLUMN_WIDTH}px` }}
          >
            <ActorIcon actor={actor} size="sm" active={tl.activeActors().has(actor)} />
            <span class="text-xs font-medium" style={{ color: ACTOR_COLORS[actor] }}>
              {ACTOR_CONFIG[actor].label}
            </span>
          </div>
        )}
      </For>
    </div>
  )
}
