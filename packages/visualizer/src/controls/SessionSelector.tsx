import { For, Show } from "solid-js"
import { useTimeline } from "@/context/timeline"

export function SessionSelector() {
  const tl = useTimeline()

  return (
    <Show when={tl.sessionIDs().length > 0}>
      <select
        class="bg-gray-800 border border-gray-700 rounded px-1.5 py-0.5 text-[10px] text-gray-300 font-mono"
        value={tl.sessionFilter() || ""}
        onChange={(e) => tl.setSessionFilter(e.currentTarget.value || null)}
      >
        <option value="">All Sessions</option>
        <For each={tl.sessionIDs()}>
          {(id) => <option value={id}>{id.slice(0, 12)}</option>}
        </For>
      </select>
    </Show>
  )
}
