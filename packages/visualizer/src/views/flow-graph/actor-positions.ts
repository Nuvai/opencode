import type { Actor } from "@/pipeline/actor-model"
import type { Point } from "@/utils/svg-math"

// Diamond layout:
//        User(200,60)      System(500,60)
//              \             /
//              Agent(350,200)
//              /             \
//        LLM(200,340)     Tools(500,340)

export const ACTOR_POSITIONS: Record<Actor, Point> = {
  user: { x: 200, y: 80 },
  system: { x: 500, y: 80 },
  agent: { x: 350, y: 210 },
  llm: { x: 200, y: 340 },
  tool: { x: 500, y: 340 },
}

export const VIEWBOX = { x: 0, y: 0, width: 700, height: 420 }
