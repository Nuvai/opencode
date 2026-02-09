export type Actor = "user" | "system" | "agent" | "llm" | "tool"
export type Category = "message" | "tool" | "token" | "control" | "error" | "permission"

export const ACTORS: Actor[] = ["user", "system", "agent", "llm", "tool"]

export const ACTOR_CONFIG: Record<Actor, { label: string; color: string; icon: string }> = {
  user: { label: "User", color: "var(--color-actor-user)", icon: "U" },
  system: { label: "System", color: "var(--color-actor-system)", icon: "S" },
  agent: { label: "Agent", color: "var(--color-actor-agent)", icon: "A" },
  llm: { label: "LLM", color: "var(--color-actor-llm)", icon: "L" },
  tool: { label: "Tools", color: "var(--color-actor-tool)", icon: "T" },
}

export const CATEGORY_CONFIG: Record<Category, { label: string; color: string }> = {
  message: { label: "Message", color: "var(--color-cat-message)" },
  tool: { label: "Tool", color: "var(--color-cat-tool)" },
  token: { label: "Token", color: "var(--color-cat-token)" },
  control: { label: "Control", color: "var(--color-cat-control)" },
  error: { label: "Error", color: "var(--color-cat-error)" },
  permission: { label: "Permission", color: "var(--color-cat-permission)" },
}

export type TimelineEntry = {
  id: string
  timestamp: number
  sequenceIndex: number
  sourceEvent: unknown
  from: Actor
  to: Actor
  label: string
  shortLabel: string
  category: Category
  sessionID: string
  messageID?: string
  partID?: string
  metadata?: {
    tokens?: { input: number; output: number; reasoning: number; cache?: { read: number; write: number } }
    cost?: number
    toolName?: string
    toolInput?: unknown
    toolOutput?: string
    modelID?: string
    providerID?: string
    duration?: number
    error?: string
    status?: string
    delta?: string
  }
}
