import { useTimeline } from "@/context/timeline"

export function ModeToggle() {
  const tl = useTimeline()

  return (
    <div class="flex items-center bg-gray-800/50 rounded overflow-hidden">
      <button
        class="px-2 py-0.5 text-[10px] font-medium transition-colors"
        classList={{
          "bg-blue-500/20 text-blue-400": tl.displayMode() === "educational",
          "text-gray-500 hover:text-gray-300": tl.displayMode() !== "educational",
        }}
        onClick={() => tl.setDisplayMode("educational")}
      >
        Simple
      </button>
      <button
        class="px-2 py-0.5 text-[10px] font-medium transition-colors"
        classList={{
          "bg-blue-500/20 text-blue-400": tl.displayMode() === "debug",
          "text-gray-500 hover:text-gray-300": tl.displayMode() !== "debug",
        }}
        onClick={() => tl.setDisplayMode("debug")}
      >
        Debug
      </button>
    </div>
  )
}
