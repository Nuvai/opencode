import { useTimeline } from "@/context/timeline"

export function EventCounter() {
  const tl = useTimeline()

  return (
    <span class="text-[10px] font-mono text-gray-500 whitespace-nowrap">
      {tl.state.cursor + 1} / {tl.state.entries.length}
    </span>
  )
}
