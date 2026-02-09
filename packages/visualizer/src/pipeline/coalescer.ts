import type { TimelineEntry } from "./actor-model"

const COALESCE_WINDOW_MS = 100

/**
 * Coalesces rapid text/reasoning deltas within a time window into single entries.
 * Returns either the entry to add, or null if it was merged into a pending entry.
 */
export function createCoalescer() {
  const pending = new Map<string, { entry: TimelineEntry; timer: ReturnType<typeof setTimeout> }>()
  let onFlush: ((entry: TimelineEntry) => void) | null = null

  function setFlushHandler(handler: (entry: TimelineEntry) => void) {
    onFlush = handler
  }

  function coalesceKey(entry: TimelineEntry): string | null {
    if (entry.category !== "token") return null
    // Group text deltas by partID
    if (entry.partID) return `token:${entry.partID}`
    return null
  }

  function process(entry: TimelineEntry): TimelineEntry | null {
    const key = coalesceKey(entry)

    // Non-coalesceable entries pass through immediately
    if (!key) return entry

    const existing = pending.get(key)
    if (existing) {
      // Merge: append delta text, update timestamp
      clearTimeout(existing.timer)
      const delta = entry.metadata?.delta || ""
      const prevDelta = existing.entry.metadata?.delta || ""
      const mergedText = prevDelta + delta
      existing.entry = {
        ...existing.entry,
        timestamp: entry.timestamp,
        label: entry.label,
        metadata: {
          ...existing.entry.metadata,
          ...entry.metadata,
          delta: mergedText,
        },
        sourceEvent: entry.sourceEvent,
      }
      existing.timer = setTimeout(() => flush(key), COALESCE_WINDOW_MS)
      return null
    }

    // Start a new coalesce window
    const timer = setTimeout(() => flush(key), COALESCE_WINDOW_MS)
    pending.set(key, { entry: { ...entry }, timer })
    return null
  }

  function flush(key: string) {
    const item = pending.get(key)
    if (!item) return
    pending.delete(key)
    onFlush?.(item.entry)
  }

  function flushAll() {
    for (const [key, item] of pending) {
      clearTimeout(item.timer)
      onFlush?.(item.entry)
    }
    pending.clear()
  }

  return { process, setFlushHandler, flushAll }
}
