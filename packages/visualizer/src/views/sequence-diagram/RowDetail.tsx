import { Show, createSignal } from "solid-js"
import type { TimelineEntry } from "@/pipeline/actor-model"
import { CategoryBadge } from "@/components/CategoryBadge"
import { TokenDisplay } from "@/components/TokenDisplay"
import { CostDisplay } from "@/components/CostDisplay"
import { RawEventViewer } from "@/components/RawEventViewer"
import { formatTimestamp, formatDuration } from "@/utils/time-format"

export function RowDetail(props: { entry: TimelineEntry }) {
  const e = () => props.entry

  return (
    <div class="px-3 py-2 bg-gray-900/80 border-t border-gray-800 text-[11px] font-mono">
      <div class="flex items-center gap-3 mb-1">
        <CategoryBadge category={e().category} />
        <span class="text-gray-500">{formatTimestamp(e().timestamp)}</span>
        <span class="text-gray-500">#{e().sequenceIndex}</span>
        <span class="text-gray-600">session: {e().sessionID.slice(0, 8)}</span>
      </div>

      <div class="text-gray-300 mb-1">{e().label}</div>

      <Show when={e().metadata}>
        {(meta) => (
          <div class="flex flex-wrap gap-x-4 gap-y-1 text-gray-500 items-center">
            <Show when={meta().toolName}>
              <span>tool: <span class="text-cyan-400">{meta().toolName}</span></span>
            </Show>
            <Show when={meta().duration !== undefined}>
              <span>duration: {formatDuration(meta().duration!)}</span>
            </Show>
            <Show when={meta().tokens}>
              <TokenDisplay tokens={meta().tokens!} />
            </Show>
            <Show when={meta().cost !== undefined && meta().cost! > 0}>
              <span>cost: <CostDisplay cost={meta().cost!} /></span>
            </Show>
            <Show when={meta().modelID}>
              <span>model: {meta().modelID}</span>
            </Show>
            <Show when={meta().error}>
              <span class="text-red-400">error: {meta().error}</span>
            </Show>
            <Show when={meta().toolOutput}>
              <div class="w-full mt-1">
                <div class="flex items-center gap-2 text-gray-600">
                  <span>output:</span>
                  <CopyButton text={meta().toolOutput!} />
                </div>
                <pre class="text-gray-400 whitespace-pre-wrap break-all max-h-48 overflow-y-auto">{meta().toolOutput}</pre>
              </div>
            </Show>
          </div>
        )}
      </Show>

      <RawEventViewer entry={e()} />
    </div>
  )
}

function CopyButton(props: { text: string }) {
  const [copied, setCopied] = createSignal(false)

  const copy = (ev: MouseEvent) => {
    ev.stopPropagation()
    navigator.clipboard.writeText(props.text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  return (
    <button
      class="text-[9px] px-1 py-0.5 rounded border border-gray-700 hover:border-gray-600 text-gray-500 hover:text-gray-300 transition-colors"
      onClick={copy}
    >
      {copied() ? "Copied" : "Copy"}
    </button>
  )
}
