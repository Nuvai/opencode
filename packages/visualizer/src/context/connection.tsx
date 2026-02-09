import { createContext, useContext, createSignal, onCleanup, onMount, type ParentProps } from "solid-js"
import { createSSEConnection, type ConnectionState } from "@/pipeline/sse-connection"
import type { TimelineEntry } from "@/pipeline/actor-model"
import { appendEvent, createRecording, finalizeRecording } from "@/store/recording-store"

type ConnectionContextValue = {
  state: () => ConnectionState
  stateDetail: () => string
  serverUrl: () => string
  setServerUrl: (url: string) => void
  connect: () => void
  disconnect: () => void
  recordingID: () => string | null
}

const ConnectionContext = createContext<ConnectionContextValue>()

export function ConnectionProvider(props: ParentProps<{ onEntry: (entry: TimelineEntry) => void }>) {
  const [state, setState] = createSignal<ConnectionState>("disconnected")
  const [stateDetail, setStateDetail] = createSignal("")
  const [serverUrl, setServerUrl] = createSignal(
    localStorage.getItem("visualizer.serverUrl") || "http://localhost:4096",
  )
  const [recordingID, setRecordingID] = createSignal<string | null>(null)

  let disconnectFn: (() => void) | null = null

  function connect() {
    if (disconnectFn) disconnectFn()

    const url = serverUrl()
    localStorage.setItem("visualizer.serverUrl", url)

    const sse = createSSEConnection(url, {
      onEntry: async (entry) => {
        props.onEntry(entry)

        const rid = recordingID()
        if (rid) {
          appendEvent(rid, entry).catch(console.error)
        }
      },
      onStateChange: async (newState, detail) => {
        const prevState = state()
        setState(newState)
        setStateDetail(detail || "")

        if (newState === "connected" && prevState !== "connected") {
          const rid = await createRecording()
          setRecordingID(rid)
        }
        if ((newState === "disconnected") && prevState === "connected") {
          const rid = recordingID()
          if (rid) {
            await finalizeRecording(rid)
            setRecordingID(null)
          }
        }
      },
    })

    disconnectFn = sse.disconnect
    sse.connect()
  }

  function disconnect() {
    const rid = recordingID()
    if (rid) {
      finalizeRecording(rid).catch(console.error)
      setRecordingID(null)
    }
    disconnectFn?.()
    disconnectFn = null
  }

  // Auto-connect on mount — sidecar waits for opencode
  onMount(() => {
    connect()
  })

  onCleanup(() => disconnect())

  const value: ConnectionContextValue = {
    state,
    stateDetail,
    serverUrl,
    setServerUrl,
    connect,
    disconnect,
    recordingID,
  }

  return <ConnectionContext.Provider value={value}>{props.children}</ConnectionContext.Provider>
}

export function useConnection() {
  const ctx = useContext(ConnectionContext)
  if (!ctx) throw new Error("useConnection must be used within ConnectionProvider")
  return ctx
}
