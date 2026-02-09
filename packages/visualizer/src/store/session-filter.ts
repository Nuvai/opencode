import { createMemo } from "solid-js"
import type { TimelineEntry } from "@/pipeline/actor-model"

/**
 * Filters timeline entries by session ID.
 * Returns all entries when filter is null.
 */
export function createSessionFilter(
  entries: () => TimelineEntry[],
  filter: () => string | null,
) {
  const filtered = createMemo(() => {
    const f = filter()
    const all = entries()
    if (!f) return all
    return all.filter((e) => e.sessionID === f)
  })

  const sessionIDs = createMemo((): string[] => {
    const seen = new Set<string>()
    for (const entry of entries()) {
      if (entry.sessionID) seen.add(entry.sessionID)
    }
    return Array.from(seen)
  })

  return { filtered, sessionIDs }
}
