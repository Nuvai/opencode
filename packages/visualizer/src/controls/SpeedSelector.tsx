import { For } from "solid-js"
import { useTimeline } from "@/context/timeline"
import type { PlaybackSpeed } from "@/store/playback-store"

const SPEEDS: PlaybackSpeed[] = [0.25, 0.5, 1, 2, 4]

export function SpeedSelector() {
  const tl = useTimeline()

  return (
    <div class="flex items-center gap-0.5">
      <For each={SPEEDS}>
        {(s) => (
          <button
            class="px-1.5 py-0.5 rounded text-[10px] font-mono transition-colors"
            classList={{
              "bg-blue-500/20 text-blue-400": tl.speed() === s,
              "text-gray-500 hover:text-gray-300": tl.speed() !== s,
            }}
            onClick={() => tl.setSpeed(s)}
          >
            {s}x
          </button>
        )}
      </For>
    </div>
  )
}
