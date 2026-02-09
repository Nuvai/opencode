import type { Event } from "@opencode-ai/sdk/v2/client"
import type { TimelineEntry, Actor, Category } from "./actor-model"

let sequenceCounter = 0

export function resetSequenceCounter() {
  sequenceCounter = 0
}

function makeId(): string {
  return `evt-${Date.now()}-${sequenceCounter}`
}

function truncate(s: string, max = 60): string {
  return s.length > max ? s.slice(0, max - 1) + "…" : s
}

export function normalizeEvent(event: Event, directory: string): TimelineEntry | null {
  const base = {
    timestamp: Date.now(),
    sequenceIndex: sequenceCounter++,
    sourceEvent: event,
  }

  switch (event.type) {
    case "session.created":
      return {
        ...base,
        id: makeId(),
        from: "system",
        to: "system",
        label: `Session Created: ${event.properties.info.title || event.properties.info.id}`,
        shortLabel: "Session+",
        category: "control",
        sessionID: event.properties.info.id,
      }

    case "session.status": {
      const status = event.properties.status
      if (status.type === "busy") {
        return {
          ...base,
          id: makeId(),
          from: "system",
          to: "agent",
          label: "Agent Activated",
          shortLabel: "Busy",
          category: "control",
          sessionID: event.properties.sessionID,
          metadata: { status: "busy" },
        }
      }
      if (status.type === "idle") {
        return {
          ...base,
          id: makeId(),
          from: "agent",
          to: "system",
          label: "Agent Idle",
          shortLabel: "Idle",
          category: "control",
          sessionID: event.properties.sessionID,
          metadata: { status: "idle" },
        }
      }
      if (status.type === "retry") {
        return {
          ...base,
          id: makeId(),
          from: "llm",
          to: "agent",
          label: `Retry #${status.attempt}: ${status.message}`,
          shortLabel: `Retry #${status.attempt}`,
          category: "error",
          sessionID: event.properties.sessionID,
          metadata: { error: status.message },
        }
      }
      return null
    }

    case "message.updated": {
      const msg = event.properties.info
      if (msg.role === "user") {
        return {
          ...base,
          id: makeId(),
          from: "user",
          to: "system",
          label: "User Message",
          shortLabel: "Msg",
          category: "message",
          sessionID: msg.sessionID,
          messageID: msg.id,
          metadata: { modelID: msg.model.modelID, providerID: msg.model.providerID },
        }
      }
      // assistant message updated (summary, tokens, etc)
      return {
        ...base,
        id: makeId(),
        from: "llm",
        to: "agent",
        label: `Assistant Updated (${msg.finish || "pending"})`,
        shortLabel: "Asst",
        category: "message",
        sessionID: msg.sessionID,
        messageID: msg.id,
        metadata: {
          tokens: "tokens" in msg ? msg.tokens : undefined,
          cost: "cost" in msg ? msg.cost : undefined,
          modelID: "modelID" in msg ? msg.modelID : undefined,
          providerID: "providerID" in msg ? msg.providerID : undefined,
        },
      }
    }

    case "message.part.updated": {
      const part = event.properties.part
      const delta = event.properties.delta

      switch (part.type) {
        case "text":
          return {
            ...base,
            id: makeId(),
            from: "llm",
            to: "agent",
            label: `Text: ${truncate(delta || part.text || "")}`,
            shortLabel: "Text",
            category: "token",
            sessionID: part.sessionID,
            messageID: part.messageID,
            partID: part.id,
            metadata: { delta: delta || undefined },
          }

        case "tool": {
          const toolName = part.tool
          const state = part.state
          if (state.status === "pending") {
            return {
              ...base,
              id: makeId(),
              from: "agent",
              to: "tool",
              label: `Call: ${toolName}`,
              shortLabel: toolName,
              category: "tool",
              sessionID: part.sessionID,
              messageID: part.messageID,
              partID: part.id,
              metadata: { toolName, toolInput: state.input },
            }
          }
          if (state.status === "running") {
            return {
              ...base,
              id: makeId(),
              from: "tool",
              to: "tool",
              label: `Running: ${toolName}`,
              shortLabel: toolName,
              category: "tool",
              sessionID: part.sessionID,
              messageID: part.messageID,
              partID: part.id,
              metadata: { toolName, toolInput: state.input },
            }
          }
          if (state.status === "completed") {
            return {
              ...base,
              id: makeId(),
              from: "tool",
              to: "agent",
              label: `Result: ${toolName}`,
              shortLabel: toolName,
              category: "tool",
              sessionID: part.sessionID,
              messageID: part.messageID,
              partID: part.id,
              metadata: {
                toolName,
                toolInput: state.input,
                toolOutput: truncate(state.output || "", 200),
                duration: state.time.end - state.time.start,
              },
            }
          }
          if (state.status === "error") {
            return {
              ...base,
              id: makeId(),
              from: "tool",
              to: "agent",
              label: `Error: ${toolName}`,
              shortLabel: toolName,
              category: "error",
              sessionID: part.sessionID,
              messageID: part.messageID,
              partID: part.id,
              metadata: {
                toolName,
                error: state.error,
                duration: state.time.end - state.time.start,
              },
            }
          }
          return null
        }

        case "step-start":
          return {
            ...base,
            id: makeId(),
            from: "agent",
            to: "llm",
            label: "LLM Step Start",
            shortLabel: "Step→",
            category: "control",
            sessionID: part.sessionID,
            messageID: part.messageID,
            partID: part.id,
          }

        case "step-finish":
          return {
            ...base,
            id: makeId(),
            from: "llm",
            to: "agent",
            label: `Step Done (${part.reason})`,
            shortLabel: "←Step",
            category: "control",
            sessionID: part.sessionID,
            messageID: part.messageID,
            partID: part.id,
            metadata: {
              tokens: part.tokens,
              cost: part.cost,
            },
          }

        case "subtask":
          return {
            ...base,
            id: makeId(),
            from: "agent",
            to: "agent",
            label: `Subtask: ${truncate(part.description || part.agent)}`,
            shortLabel: "Subtask",
            category: "control",
            sessionID: part.sessionID,
            messageID: part.messageID,
            partID: part.id,
          }

        case "reasoning":
          return {
            ...base,
            id: makeId(),
            from: "llm",
            to: "agent",
            label: `Reasoning: ${truncate(delta || part.text || "")}`,
            shortLabel: "Think",
            category: "token",
            sessionID: part.sessionID,
            messageID: part.messageID,
            partID: part.id,
            metadata: { delta: delta || undefined },
          }

        case "agent":
          return {
            ...base,
            id: makeId(),
            from: "agent",
            to: "agent",
            label: `Agent: ${part.name}`,
            shortLabel: part.name,
            category: "control",
            sessionID: part.sessionID,
            messageID: part.messageID,
            partID: part.id,
          }

        default:
          return null
      }
    }

    case "permission.asked":
      return {
        ...base,
        id: makeId(),
        from: "agent",
        to: "user",
        label: `Permission: ${event.properties.permission}`,
        shortLabel: "Perm?",
        category: "permission",
        sessionID: event.properties.sessionID,
      }

    case "permission.replied": {
      const reply = event.properties.reply
      return {
        ...base,
        id: makeId(),
        from: "user",
        to: "agent",
        label: `Permission ${reply === "reject" ? "Denied" : "Granted"} (${reply})`,
        shortLabel: reply === "reject" ? "Deny" : "Allow",
        category: "permission",
        sessionID: event.properties.sessionID,
      }
    }

    case "session.error":
      return {
        ...base,
        id: makeId(),
        from: "llm",
        to: "system",
        label: `Error: ${event.properties.error?.data?.message || "Unknown"}`,
        shortLabel: "Error",
        category: "error",
        sessionID: event.properties.sessionID || "unknown",
        metadata: { error: event.properties.error?.data?.message },
      }

    case "session.updated":
      return {
        ...base,
        id: makeId(),
        from: "system",
        to: "system",
        label: `Session Updated: ${event.properties.info.title}`,
        shortLabel: "Updated",
        category: "control",
        sessionID: event.properties.info.id,
      }

    default:
      return null
  }
}
