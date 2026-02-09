import { useTimeline } from "@/context/timeline"
import { useConnection } from "@/context/connection"

export function PlayPauseButton() {
  const tl = useTimeline()
  const conn = useConnection()

  const isLive = () => tl.state.mode === "live"
  const isPaused = () => tl.state.mode === "paused"
  const isPlaying = () => tl.state.mode === "playing"

  function toggle() {
    if (isLive()) {
      tl.setMode("paused")
    } else if (isPaused()) {
      // If connected, go live; otherwise play recording
      if (conn.state() === "connected") {
        tl.setMode("live")
      } else {
        tl.setMode("playing")
      }
    } else {
      tl.setMode("paused")
    }
  }

  return (
    <button
      class="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors"
      classList={{
        "bg-green-500/20 text-green-400 hover:bg-green-500/30": isLive(),
        "bg-gray-700 text-gray-300 hover:bg-gray-600": isPaused(),
        "bg-blue-500/20 text-blue-400 hover:bg-blue-500/30": isPlaying(),
      }}
      onClick={toggle}
    >
      {isLive() && (
        <>
          <span class="w-2 h-2 rounded-full bg-green-400 animate-live-pulse" />
          LIVE
        </>
      )}
      {isPaused() && (
        <>
          <span>▶</span>
          Play
        </>
      )}
      {isPlaying() && (
        <>
          <span>⏸</span>
          Pause
        </>
      )}
    </button>
  )
}
