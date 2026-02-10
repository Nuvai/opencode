import { Show, For, createMemo, createSignal } from "solid-js"
import { useTimeline } from "@/context/timeline"
import { CategoryBadge } from "@/components/CategoryBadge"
import { ActorIcon } from "@/components/ActorIcon"
import { TokenDisplay } from "@/components/TokenDisplay"
import { CostDisplay } from "@/components/CostDisplay"
import { formatTimestamp, formatDuration } from "@/utils/time-format"
import type { TimelineEntry } from "@/pipeline/actor-model"

function Section(props: { title: string; children: any }) {
  return (
    <div class="mb-3">
      <div class="text-[9px] uppercase tracking-wider text-gray-600 mb-1.5 font-semibold">{props.title}</div>
      {props.children}
    </div>
  )
}

function Row(props: { label: string; value: any; mono?: boolean }) {
  return (
    <div class="flex items-start gap-2 text-[11px] py-0.5">
      <span class="text-gray-600 shrink-0 w-20">{props.label}</span>
      <span class={`text-gray-300 break-all ${props.mono ? "font-mono" : ""}`}>{props.value}</span>
    </div>
  )
}

function CopyJsonButton(props: { data: unknown }) {
  const [copied, setCopied] = createSignal(false)

  const copy = () => {
    navigator.clipboard.writeText(JSON.stringify(props.data, null, 2)).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  return (
    <button
      class="text-[9px] px-1.5 py-0.5 rounded border border-gray-700 hover:border-gray-600 text-gray-500 hover:text-gray-300 transition-colors"
      onClick={copy}
    >
      {copied() ? "Copied" : "Copy JSON"}
    </button>
  )
}

export function EventDetailPanel() {
  const tl = useTimeline()
  const [showRaw, setShowRaw] = createSignal(false)

  const entry = () => tl.selectedEntry()

  const relatedEntries = createMemo((): TimelineEntry[] => {
    const e = entry()
    if (!e) return []
    const partID = e.partID
    const messageID = e.messageID
    if (!partID && !messageID) return []

    const entries = tl.filteredEntries()
    const seqIdx = e.sequenceIndex
    const minIdx = seqIdx - 50
    const maxIdx = seqIdx + 50

    return entries.filter(
      (other) =>
        other.id !== e.id &&
        other.sequenceIndex >= minIdx &&
        other.sequenceIndex <= maxIdx &&
        ((partID && other.partID === partID) || (messageID && other.messageID === messageID)),
    )
  })

  return (
    <Show when={entry()}>
      {(e) => (
        <div class="fixed top-0 right-0 w-96 h-full z-50 bg-gray-950 border-l border-gray-800 flex flex-col animate-slide-in-right">
          {/* Header */}
          <div class="flex items-center gap-2 px-3 py-2 border-b border-gray-800 shrink-0">
            <CategoryBadge category={e().category} />
            <span class="text-xs font-medium text-gray-200 flex-1">Event Detail</span>
            <CopyJsonButton data={e().sourceEvent} />
            <button
              class="text-gray-500 hover:text-gray-300 text-sm px-1"
              onClick={() => tl.setSelectedEntry(null)}
            >
              ✕
            </button>
          </div>

          {/* Body */}
          <div class="flex-1 overflow-y-auto px-3 py-3 text-xs">
            <Section title="Identity">
              <Row label="ID" value={e().id} mono />
              <Row label="Sequence" value={`#${e().sequenceIndex}`} mono />
              <Row label="Timestamp" value={formatTimestamp(e().timestamp)} mono />
              <Row label="Session" value={e().sessionID.slice(0, 12) + "..."} mono />
              <Row
                label="Direction"
                value={
                  <span class="flex items-center gap-1.5">
                    <ActorIcon actor={e().from} size="xs" />
                    <span class="text-gray-600">→</span>
                    <ActorIcon actor={e().to} size="xs" />
                  </span>
                }
              />
              <Row label="Label" value={e().label} />
              <Row label="Short" value={e().shortLabel} />
            </Section>

            <Show when={e().metadata}>
              {(meta) => (
                <Section title="Metadata">
                  <Show when={meta().toolName}>
                    <Row label="Tool" value={<span class="text-cyan-400">{meta().toolName}</span>} />
                  </Show>
                  <Show when={meta().duration !== undefined}>
                    <Row label="Duration" value={formatDuration(meta().duration!)} />
                  </Show>
                  <Show when={meta().tokens}>
                    <Row label="Tokens" value={<TokenDisplay tokens={meta().tokens!} />} />
                  </Show>
                  <Show when={meta().cost !== undefined && meta().cost! > 0}>
                    <Row label="Cost" value={<CostDisplay cost={meta().cost!} />} />
                  </Show>
                  <Show when={meta().modelID}>
                    <Row label="Model" value={meta().modelID} mono />
                  </Show>
                  <Show when={meta().providerID}>
                    <Row label="Provider" value={meta().providerID} mono />
                  </Show>
                  <Show when={meta().error}>
                    <Row label="Error" value={<span class="text-red-400">{meta().error}</span>} />
                  </Show>
                  <Show when={meta().status}>
                    <Row label="Status" value={meta().status} />
                  </Show>
                  <Show when={meta().toolOutput}>
                    <div class="mt-2">
                      <div class="text-[9px] text-gray-600 mb-1">Tool Output:</div>
                      <pre class="text-[10px] text-gray-400 font-mono whitespace-pre-wrap break-all max-h-48 overflow-y-auto bg-gray-900/60 rounded p-2 border border-gray-800/50">
                        {meta().toolOutput}
                      </pre>
                    </div>
                  </Show>
                  <Show when={meta().toolInput}>
                    <div class="mt-2">
                      <div class="text-[9px] text-gray-600 mb-1">Tool Input:</div>
                      <pre class="text-[10px] text-gray-400 font-mono whitespace-pre-wrap break-all max-h-32 overflow-y-auto bg-gray-900/60 rounded p-2 border border-gray-800/50">
                        {JSON.stringify(meta().toolInput, null, 2)}
                      </pre>
                    </div>
                  </Show>
                </Section>
              )}
            </Show>

            <Show when={relatedEntries().length > 0}>
              <Section title={`Related (${relatedEntries().length})`}>
                <div class="space-y-1 max-h-40 overflow-y-auto">
                  <For each={relatedEntries()}>
                    {(rel) => (
                      <button
                        class="w-full text-left flex items-center gap-2 px-2 py-1 rounded hover:bg-gray-800/60 transition-colors"
                        onClick={() => tl.setSelectedEntry(rel)}
                      >
                        <CategoryBadge category={rel.category} />
                        <span class="text-[10px] text-gray-400 truncate flex-1">{rel.shortLabel}</span>
                        <span class="text-[9px] text-gray-600 font-mono">#{rel.sequenceIndex}</span>
                      </button>
                    )}
                  </For>
                </div>
              </Section>
            </Show>

            {/* Raw JSON */}
            <div class="mt-2">
              <button
                class="text-[9px] text-gray-600 hover:text-gray-400 transition-colors"
                onClick={() => setShowRaw(!showRaw())}
              >
                {showRaw() ? "▼" : "▶"} Raw Source Event
              </button>
              <Show when={showRaw()}>
                <pre class="mt-1 text-[9px] text-gray-500 font-mono whitespace-pre-wrap break-all max-h-64 overflow-y-auto bg-gray-900/60 rounded p-2 border border-gray-800/50">
                  {JSON.stringify(e().sourceEvent, null, 2)}
                </pre>
              </Show>
            </div>
          </div>
        </div>
      )}
    </Show>
  )
}
