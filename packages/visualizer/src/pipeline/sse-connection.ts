import { createOpencodeClient, type Event } from "@opencode-ai/sdk/v2/client"
import { normalizeEvent, resetSequenceCounter } from "./event-normalizer"
import { createCoalescer } from "./coalescer"
import type { TimelineEntry } from "./actor-model"

export type ConnectionState =
  | "disconnected"   // user has not requested connection or explicitly disconnected
  | "waiting"        // server not reachable, will retry
  | "connecting"     // actively establishing SSE stream
  | "connected"      // SSE stream is live
  | "error"          // transient error, will retry

export type SSECallbacks = {
  onEntry: (entry: TimelineEntry) => void
  onStateChange: (state: ConnectionState, detail?: string) => void
  onRawEvent?: (event: Event, directory: string) => void
}

const INITIAL_RETRY_MS = 1000
const MAX_RETRY_MS = 15000
const BACKOFF_FACTOR = 1.5

export function createSSEConnection(serverUrl: string, callbacks: SSECallbacks) {
  let abort: AbortController | null = null
  let retryTimer: ReturnType<typeof setTimeout> | null = null
  let retryDelay = INITIAL_RETRY_MS
  let retryCount = 0
  let intentionalDisconnect = false

  const coalescer = createCoalescer()
  coalescer.setFlushHandler((entry) => {
    callbacks.onEntry(entry)
  })

  function handleEntry(entry: TimelineEntry) {
    const result = coalescer.process(entry)
    if (result) {
      callbacks.onEntry(result)
    }
  }

  async function attemptConnect() {
    if (intentionalDisconnect) return

    abort = new AbortController()
    callbacks.onStateChange("connecting")

    try {
      // Probe the server first with a quick fetch to avoid a long SSE hang
      const probeAbort = new AbortController()
      const probeTimer = setTimeout(() => probeAbort.abort(), 3000)
      try {
        await fetch(`${serverUrl}/health`, { signal: probeAbort.signal }).catch(() => {
          // /health might not exist, try the base URL
          return fetch(serverUrl, { signal: probeAbort.signal })
        })
      } catch {
        clearTimeout(probeTimer)
        throw new Error("Server not reachable")
      }
      clearTimeout(probeTimer)

      if (intentionalDisconnect || abort.signal.aborted) return

      // Server is reachable, open SSE stream
      resetSequenceCounter()
      const client = createOpencodeClient({
        baseUrl: serverUrl,
        signal: abort.signal,
      })

      const events = await client.global.event()

      // Successfully connected — reset retry state
      retryDelay = INITIAL_RETRY_MS
      retryCount = 0
      callbacks.onStateChange("connected")

      let yielded = Date.now()
      for await (const event of events.stream) {
        if (intentionalDisconnect) break

        const directory = event.directory ?? "global"
        const payload = event.payload

        callbacks.onRawEvent?.(payload, directory)

        const entry = normalizeEvent(payload, directory)
        if (entry) {
          handleEntry(entry)
        }

        if (Date.now() - yielded > 8) {
          yielded = Date.now()
          await new Promise<void>((r) => setTimeout(r, 0))
        }
      }
    } catch (err) {
      coalescer.flushAll()

      if (intentionalDisconnect || abort?.signal.aborted) return

      // Connection failed or dropped — schedule retry
      retryCount++
      retryDelay = Math.min(MAX_RETRY_MS, retryDelay * BACKOFF_FACTOR)

      const detail = `Retry #${retryCount} in ${(retryDelay / 1000).toFixed(1)}s`
      callbacks.onStateChange("waiting", detail)
      console.warn(`[Visualizer SSE] ${detail}`, err)

      retryTimer = setTimeout(() => {
        retryTimer = null
        attemptConnect()
      }, retryDelay)
      return
    }

    coalescer.flushAll()

    // Stream ended cleanly (server shut down gracefully) — retry
    if (!intentionalDisconnect) {
      retryCount++
      const detail = `Server disconnected. Retry #${retryCount} in ${(INITIAL_RETRY_MS / 1000).toFixed(1)}s`
      retryDelay = INITIAL_RETRY_MS
      callbacks.onStateChange("waiting", detail)

      retryTimer = setTimeout(() => {
        retryTimer = null
        attemptConnect()
      }, INITIAL_RETRY_MS)
    }
  }

  function connect() {
    intentionalDisconnect = false
    retryDelay = INITIAL_RETRY_MS
    retryCount = 0
    attemptConnect()
  }

  function disconnect() {
    intentionalDisconnect = true
    if (retryTimer) {
      clearTimeout(retryTimer)
      retryTimer = null
    }
    if (abort) {
      abort.abort()
      abort = null
    }
    coalescer.flushAll()
    callbacks.onStateChange("disconnected")
  }

  return { connect, disconnect }
}
