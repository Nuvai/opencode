import { useConnection } from "@/context/connection"
import { Show, createSignal } from "solid-js"

export function ConnectionStatus() {
  const conn = useConnection()
  const [editing, setEditing] = createSignal(false)
  const [urlInput, setUrlInput] = createSignal(conn.serverUrl())

  const stateColor = () => {
    switch (conn.state()) {
      case "connected": return "bg-green-400"
      case "connecting": return "bg-yellow-400 animate-pulse"
      case "waiting": return "bg-orange-400 animate-live-pulse"
      case "error": return "bg-red-400"
      default: return "bg-gray-500"
    }
  }

  const stateLabel = () => {
    switch (conn.state()) {
      case "connected": return "Connected"
      case "connecting": return "Connecting..."
      case "waiting": return conn.stateDetail() || "Waiting for server..."
      case "error": return "Error"
      default: return "Disconnected"
    }
  }

  function handleSubmitUrl() {
    conn.setServerUrl(urlInput())
    setEditing(false)
    conn.disconnect()
    // Small delay then reconnect with new URL
    setTimeout(() => conn.connect(), 100)
  }

  function handleToggle() {
    if (conn.state() === "connected" || conn.state() === "waiting" || conn.state() === "connecting") {
      conn.disconnect()
    } else {
      conn.connect()
    }
  }

  return (
    <div class="flex items-center gap-2">
      <div class={`w-2 h-2 rounded-full shrink-0 ${stateColor()}`} />
      <span class="text-[10px] text-gray-400 max-w-48 truncate">{stateLabel()}</span>

      <Show when={editing()}>
        <input
          class="bg-gray-800 border border-gray-700 rounded px-2 py-0.5 text-xs text-gray-200 w-48 focus:border-blue-500 focus:outline-none"
          value={urlInput()}
          onInput={(e) => setUrlInput(e.currentTarget.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSubmitUrl()
            if (e.key === "Escape") setEditing(false)
          }}
          autofocus
        />
        <button
          class="text-[10px] text-blue-400 hover:text-blue-300"
          onClick={handleSubmitUrl}
        >
          Save
        </button>
      </Show>
      <Show when={!editing()}>
        <button class="text-[10px] text-gray-600 hover:text-gray-400 truncate max-w-32" onClick={() => { setUrlInput(conn.serverUrl()); setEditing(true) }}>
          {conn.serverUrl()}
        </button>
      </Show>

      <button
        class="text-[10px] px-2 py-0.5 rounded border transition-colors"
        classList={{
          "border-red-800 text-red-400 hover:border-red-600": conn.state() === "connected" || conn.state() === "waiting" || conn.state() === "connecting",
          "border-gray-700 text-gray-300 hover:border-gray-500": conn.state() === "disconnected" || conn.state() === "error",
        }}
        onClick={handleToggle}
      >
        {conn.state() === "connected" || conn.state() === "waiting" || conn.state() === "connecting"
          ? "Disconnect"
          : "Connect"}
      </button>
    </div>
  )
}
