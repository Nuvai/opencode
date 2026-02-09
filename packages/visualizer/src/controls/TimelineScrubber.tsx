import { useTimeline } from "@/context/timeline"

export function TimelineScrubber() {
  const tl = useTimeline()

  const max = () => Math.max(0, tl.state.entries.length - 1)

  function handleInput(e: Event) {
    const value = parseInt((e.target as HTMLInputElement).value)
    tl.setMode("paused")
    tl.setCursor(value)
  }

  return (
    <div class="flex-1 flex items-center gap-2 min-w-0">
      <input
        type="range"
        min={0}
        max={max()}
        value={tl.state.cursor}
        onInput={handleInput}
        class="flex-1 h-1 appearance-none bg-gray-800 rounded-full cursor-pointer accent-blue-500"
        style={{
          background: max() > 0
            ? `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${(tl.state.cursor / max()) * 100}%, #1f2937 ${(tl.state.cursor / max()) * 100}%, #1f2937 100%)`
            : "#1f2937",
        }}
      />
    </div>
  )
}
