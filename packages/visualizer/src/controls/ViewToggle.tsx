import { useTimeline } from "@/context/timeline"

export function ViewToggle() {
  const tl = useTimeline()

  return (
    <div class="flex items-center bg-gray-800/50 rounded overflow-hidden">
      <button
        class="px-2 py-0.5 text-[10px] font-medium transition-colors"
        classList={{
          "bg-purple-500/20 text-purple-400": tl.activeView() === "sequence",
          "text-gray-500 hover:text-gray-300": tl.activeView() !== "sequence",
        }}
        onClick={() => tl.setActiveView("sequence")}
      >
        Sequence
      </button>
      <button
        class="px-2 py-0.5 text-[10px] font-medium transition-colors"
        classList={{
          "bg-purple-500/20 text-purple-400": tl.activeView() === "flow",
          "text-gray-500 hover:text-gray-300": tl.activeView() !== "flow",
        }}
        onClick={() => tl.setActiveView("flow")}
      >
        Flow Graph
      </button>
    </div>
  )
}
