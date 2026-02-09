import type { Actor } from "@/pipeline/actor-model"
import { ACTOR_POSITIONS } from "./actor-positions"
import { cubicBezierPath } from "@/utils/svg-math"

export function getEdgePath(from: Actor, to: Actor): string {
  return cubicBezierPath(ACTOR_POSITIONS[from], ACTOR_POSITIONS[to])
}
