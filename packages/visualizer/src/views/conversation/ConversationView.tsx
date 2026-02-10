import { For, Show, createMemo, createEffect, createSignal } from "solid-js"
import { useTimeline } from "@/context/timeline"
import type { TimelineEntry } from "@/pipeline/actor-model"
import { ACTOR_COLORS } from "@/utils/color"
import { ACTOR_CONFIG } from "@/pipeline/actor-model"
import { ActorIcon } from "@/components/ActorIcon"
import { CategoryBadge } from "@/components/CategoryBadge"
import { formatTimestamp, formatDuration } from "@/utils/time-format"

type ConversationItem =
  | { type: "message"; role: "user" | "assistant"; text: string; timestamp: number; entry: TimelineEntry; streaming?: boolean }
  | { type: "tool-call"; toolName: string; input: string; timestamp: number; entry: TimelineEntry }
  | { type: "tool-result"; toolName: string; output: string; duration?: number; error?: boolean; timestamp: number; entry: TimelineEntry }
  | { type: "step"; label: string; tokens?: string; cost?: string; timestamp: number; entry: TimelineEntry }
  | { type: "event"; label: string; timestamp: number; entry: TimelineEntry }

function buildConversation(entries: TimelineEntry[]): ConversationItem[] {
  const items: ConversationItem[] = []
  const textAccum = new Map<string, string>() // partID → accumulated text

  for (const e of entries) {
    // User messages
    if (e.category === "message" && e.from === "user") {
      items.push({ type: "message", role: "user", text: e.label, timestamp: e.timestamp, entry: e })
      continue
    }

    // Text parts (LLM output) - accumulate by partID
    if (e.category === "token" && e.from === "llm" && e.partID) {
      const delta = e.metadata?.delta
      if (delta) {
        const prev = textAccum.get(e.partID) || ""
        textAccum.set(e.partID, prev + delta)
      } else {
        // Full text replacement fallback (some SDK versions send full text)
        const src = e.sourceEvent as any
        const fullText = src?.properties?.part?.text
        if (fullText) textAccum.set(e.partID, fullText)
      }
      continue
    }

    // Tool calls
    if (e.category === "tool" && e.from === "agent" && e.to === "tool") {
      const input = e.metadata?.toolInput ? JSON.stringify(e.metadata.toolInput, null, 2) : ""
      items.push({ type: "tool-call", toolName: e.metadata?.toolName || "unknown", input, timestamp: e.timestamp, entry: e })
      continue
    }

    // Tool results
    if (e.category === "tool" && e.from === "tool" && e.to === "agent") {
      items.push({
        type: "tool-result",
        toolName: e.metadata?.toolName || "unknown",
        output: e.metadata?.toolOutput || "",
        duration: e.metadata?.duration,
        error: e.category === "error",
        timestamp: e.timestamp,
        entry: e,
      })
      continue
    }

    // Tool errors
    if (e.category === "error" && e.metadata?.toolName) {
      items.push({
        type: "tool-result",
        toolName: e.metadata.toolName,
        output: e.metadata.error || "Error",
        duration: e.metadata.duration,
        error: true,
        timestamp: e.timestamp,
        entry: e,
      })
      continue
    }

    // Step finish — flush accumulated text
    if (e.shortLabel === "←Step") {
      // Emit accumulated text as a message
      const allText = Array.from(textAccum.values()).join("")
      if (allText.trim()) {
        items.push({ type: "message", role: "assistant", text: allText, timestamp: e.timestamp, entry: e })
      }
      textAccum.clear()

      const tokStr = e.metadata?.tokens ? `${(e.metadata.tokens.input + e.metadata.tokens.output).toLocaleString()} tokens` : ""
      const costStr = e.metadata?.cost ? `$${e.metadata.cost.toFixed(4)}` : ""
      items.push({ type: "step", label: e.label, tokens: tokStr, cost: costStr, timestamp: e.timestamp, entry: e })
      continue
    }

    // Permission events
    if (e.category === "permission") {
      items.push({ type: "event", label: e.label, timestamp: e.timestamp, entry: e })
      continue
    }

    // Errors
    if (e.category === "error") {
      items.push({ type: "event", label: e.label, timestamp: e.timestamp, entry: e })
      continue
    }
  }

  // Flush any remaining text (still streaming — no step-finish yet)
  const remaining = Array.from(textAccum.values()).join("")
  if (remaining.trim() && entries.length > 0) {
    const lastEntry = entries[entries.length - 1]
    items.push({ type: "message", role: "assistant", text: remaining, timestamp: lastEntry.timestamp, entry: lastEntry, streaming: true })
  }

  return items
}

function MessageBubble(props: { item: ConversationItem & { type: "message" } }) {
  const isUser = () => props.item.role === "user"

  return (
    <div class={`flex gap-2 ${isUser() ? "flex-row-reverse" : ""}`}>
      <ActorIcon actor={isUser() ? "user" : "llm"} size="sm" />
      <div
        class={`max-w-[70%] rounded-lg px-3 py-2 text-xs ${isUser() ? "bg-blue-500/15 border border-blue-500/30" : "bg-gray-800/60 border border-gray-700/50"}`}
      >
        <pre class="whitespace-pre-wrap break-words font-sans text-gray-200 leading-relaxed">
          {props.item.text}
          {props.item.streaming && <span class="animate-pulse text-purple-400">|</span>}
        </pre>
        <div class="text-[9px] text-gray-600 mt-1 font-mono">{formatTimestamp(props.item.timestamp)}</div>
      </div>
    </div>
  )
}

function ToolCallBubble(props: { item: ConversationItem & { type: "tool-call" } }) {
  const [expanded, setExpanded] = createSignal(false)

  return (
    <div class="flex gap-2 ml-10">
      <div class="w-full max-w-[80%] rounded-lg border border-cyan-500/20 bg-cyan-500/5 px-3 py-2">
        <div class="flex items-center gap-2 cursor-pointer" onClick={() => setExpanded(!expanded())}>
          <span class="text-[10px] text-cyan-400 font-mono font-medium">{props.item.toolName}</span>
          <CategoryBadge category="tool" />
          <span class="text-[9px] text-gray-600 font-mono ml-auto">{formatTimestamp(props.item.timestamp)}</span>
          <span class="text-[10px] text-gray-600">{expanded() ? "▼" : "▶"}</span>
        </div>
        <Show when={expanded() && props.item.input}>
          <pre class="mt-1.5 text-[10px] text-gray-400 font-mono whitespace-pre-wrap break-all max-h-32 overflow-y-auto bg-gray-900/50 rounded p-2">
            {props.item.input}
          </pre>
        </Show>
      </div>
    </div>
  )
}

function ToolResultBubble(props: { item: ConversationItem & { type: "tool-result" } }) {
  const [expanded, setExpanded] = createSignal(false)

  return (
    <div class="flex gap-2 ml-10">
      <div class={`w-full max-w-[80%] rounded-lg px-3 py-2 border ${props.item.error ? "border-red-500/20 bg-red-500/5" : "border-green-500/20 bg-green-500/5"}`}>
        <div class="flex items-center gap-2 cursor-pointer" onClick={() => setExpanded(!expanded())}>
          <span class={`text-[10px] font-mono font-medium ${props.item.error ? "text-red-400" : "text-green-400"}`}>
            {props.item.error ? "✗" : "✓"} {props.item.toolName}
          </span>
          <Show when={props.item.duration}>
            <span class="text-[9px] text-gray-600 font-mono">{formatDuration(props.item.duration!)}</span>
          </Show>
          <span class="text-[10px] text-gray-600 ml-auto">{expanded() ? "▼" : "▶"}</span>
        </div>
        <Show when={expanded() && props.item.output}>
          <pre class="mt-1.5 text-[10px] text-gray-400 font-mono whitespace-pre-wrap break-all max-h-32 overflow-y-auto bg-gray-900/50 rounded p-2">
            {props.item.output}
          </pre>
        </Show>
      </div>
    </div>
  )
}

function StepDivider(props: { item: ConversationItem & { type: "step" } }) {
  return (
    <div class="flex items-center gap-2 py-1">
      <div class="flex-1 border-t border-dashed border-gray-800" />
      <span class="text-[9px] text-gray-600 font-mono shrink-0">
        {props.item.tokens} {props.item.cost ? `· ${props.item.cost}` : ""}
      </span>
      <div class="flex-1 border-t border-dashed border-gray-800" />
    </div>
  )
}

function EventBubble(props: { item: ConversationItem & { type: "event" } }) {
  return (
    <div class="flex justify-center">
      <div class="bg-gray-800/30 rounded px-3 py-1 text-[10px] text-gray-400 border border-gray-800/50">
        <CategoryBadge category={props.item.entry.category} />
        <span class="ml-1.5">{props.item.label}</span>
      </div>
    </div>
  )
}

export function ConversationView() {
  const tl = useTimeline()
  let containerRef: HTMLDivElement | undefined

  const items = createMemo(() => buildConversation(tl.visibleEntries()))

  createEffect(() => {
    const _ = items().length
    if (tl.state.mode === "live" && containerRef) {
      requestAnimationFrame(() => {
        containerRef!.scrollTop = containerRef!.scrollHeight
      })
    }
  })

  return (
    <div class="flex flex-col h-full">
      <div class="flex items-center gap-4 px-4 py-2 border-b border-gray-800 shrink-0">
        <span class="text-xs font-medium text-gray-300">Conversation</span>
        <span class="text-[10px] text-gray-500 font-mono">{items().length} items</span>
      </div>

      <div ref={containerRef} class="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        <Show
          when={items().length > 0}
          fallback={
            <div class="flex items-center justify-center h-full text-gray-600 text-sm">
              No conversation yet — send a message in OpenCode
            </div>
          }
        >
          <For each={items()}>
            {(item) => (
              <div onClick={() => tl.setSelectedEntry(item.entry)} class="cursor-pointer">
                {item.type === "message" ? <MessageBubble item={item} />
                  : item.type === "tool-call" ? <ToolCallBubble item={item} />
                  : item.type === "tool-result" ? <ToolResultBubble item={item} />
                  : item.type === "step" ? <StepDivider item={item} />
                  : <EventBubble item={item} />}
              </div>
            )}
          </For>
        </Show>
      </div>
    </div>
  )
}
