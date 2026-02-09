import type { Actor, Category } from "@/pipeline/actor-model"

export const ACTOR_COLORS: Record<Actor, string> = {
  user: "#60a5fa",
  system: "#4ade80",
  agent: "#f97316",
  llm: "#c084fc",
  tool: "#22d3ee",
}

export const CATEGORY_COLORS: Record<Category, string> = {
  message: "#3b82f6",
  tool: "#22c55e",
  token: "#f97316",
  control: "#8b95a5",
  error: "#ef4444",
  permission: "#a855f7",
}

export function actorBgClass(actor: Actor): string {
  const map: Record<Actor, string> = {
    user: "bg-blue-400/20",
    system: "bg-green-400/20",
    agent: "bg-orange-400/20",
    llm: "bg-purple-400/20",
    tool: "bg-cyan-400/20",
  }
  return map[actor]
}

export function actorTextClass(actor: Actor): string {
  const map: Record<Actor, string> = {
    user: "text-blue-400",
    system: "text-green-400",
    agent: "text-orange-400",
    llm: "text-purple-400",
    tool: "text-cyan-400",
  }
  return map[actor]
}

export function categoryBorderClass(category: Category): string {
  const map: Record<Category, string> = {
    message: "border-blue-500/40",
    tool: "border-green-500/40",
    token: "border-orange-500/40",
    control: "border-gray-500/40",
    error: "border-red-500/40",
    permission: "border-purple-500/40",
  }
  return map[category]
}
