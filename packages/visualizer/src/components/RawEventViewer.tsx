import { Show, createSignal } from "solid-js"
import type { TimelineEntry } from "@/pipeline/actor-model"

export function RawEventViewer(props: { entry: TimelineEntry }) {
  const [expanded, setExpanded] = createSignal(false)

  const jsonStr = () => JSON.stringify(props.entry.sourceEvent, null, 2)

  return (
    <div class="mt-2">
      <button
        class="text-[10px] text-gray-500 hover:text-gray-300 font-mono"
        onClick={() => setExpanded(!expanded())}
      >
        {expanded() ? "▼ Hide Raw Event" : "▶ Show Raw Event"}
      </button>
      <Show when={expanded()}>
        <pre class="mt-1 p-2 bg-gray-900 rounded text-[10px] font-mono text-gray-400 overflow-x-auto max-h-48 overflow-y-auto">
          {jsonStr()}
        </pre>
      </Show>
    </div>
  )
}
