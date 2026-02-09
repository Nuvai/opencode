import type { TimelineEntry } from "@/pipeline/actor-model"

export type RecordingMeta = {
  id: string
  startTime: number
  endTime: number
  sessionIDs: string[]
  eventCount: number
}

const DB_NAME = "opencode-visualizer"
const DB_VERSION = 1

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains("recordings")) {
        db.createObjectStore("recordings", { keyPath: "id" })
      }
      if (!db.objectStoreNames.contains("events")) {
        const store = db.createObjectStore("events", { keyPath: ["recordingID", "sequenceIndex"] })
        store.createIndex("byRecording", "recordingID")
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function listRecordings(): Promise<RecordingMeta[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction("recordings", "readonly")
    const store = tx.objectStore("recordings")
    const req = store.getAll()
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function createRecording(): Promise<string> {
  const db = await openDB()
  const id = `rec-${Date.now()}`
  const meta: RecordingMeta = {
    id,
    startTime: Date.now(),
    endTime: 0,
    sessionIDs: [],
    eventCount: 0,
  }
  return new Promise((resolve, reject) => {
    const tx = db.transaction("recordings", "readwrite")
    const store = tx.objectStore("recordings")
    store.put(meta)
    tx.oncomplete = () => resolve(id)
    tx.onerror = () => reject(tx.error)
  })
}

export async function appendEvent(recordingID: string, entry: TimelineEntry): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(["events", "recordings"], "readwrite")
    const evtStore = tx.objectStore("events")
    const recStore = tx.objectStore("recordings")

    evtStore.put({ ...entry, recordingID })

    const getReq = recStore.get(recordingID)
    getReq.onsuccess = () => {
      const meta = getReq.result as RecordingMeta
      if (meta) {
        meta.eventCount++
        meta.endTime = entry.timestamp
        if (entry.sessionID && !meta.sessionIDs.includes(entry.sessionID)) {
          meta.sessionIDs.push(entry.sessionID)
        }
        recStore.put(meta)
      }
    }

    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function finalizeRecording(recordingID: string): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction("recordings", "readwrite")
    const store = tx.objectStore("recordings")
    const getReq = store.get(recordingID)
    getReq.onsuccess = () => {
      const meta = getReq.result as RecordingMeta
      if (meta) {
        meta.endTime = Date.now()
        store.put(meta)
      }
    }
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function loadRecordingEvents(recordingID: string): Promise<TimelineEntry[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction("events", "readonly")
    const store = tx.objectStore("events")
    const index = store.index("byRecording")
    const req = index.getAll(recordingID)
    req.onsuccess = () => {
      const entries = req.result.map((e: any) => {
        const { recordingID: _, ...entry } = e
        return entry as TimelineEntry
      })
      entries.sort((a: TimelineEntry, b: TimelineEntry) => a.sequenceIndex - b.sequenceIndex)
      resolve(entries)
    }
    req.onerror = () => reject(req.error)
  })
}

export async function deleteRecording(recordingID: string): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(["events", "recordings"], "readwrite")
    const evtStore = tx.objectStore("events")
    const recStore = tx.objectStore("recordings")

    recStore.delete(recordingID)

    const index = evtStore.index("byRecording")
    const cursor = index.openKeyCursor(recordingID)
    cursor.onsuccess = () => {
      const c = cursor.result
      if (c) {
        evtStore.delete(c.primaryKey)
        c.continue()
      }
    }

    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function exportRecording(recordingID: string): Promise<string> {
  const [meta, events] = await Promise.all([
    openDB().then(
      (db) =>
        new Promise<RecordingMeta>((resolve, reject) => {
          const tx = db.transaction("recordings", "readonly")
          const req = tx.objectStore("recordings").get(recordingID)
          req.onsuccess = () => resolve(req.result)
          req.onerror = () => reject(req.error)
        }),
    ),
    loadRecordingEvents(recordingID),
  ])
  return JSON.stringify({ meta, events }, null, 2)
}

export async function importRecording(json: string): Promise<string> {
  const data = JSON.parse(json)
  const meta = data.meta as RecordingMeta
  const events = data.events as TimelineEntry[]

  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(["events", "recordings"], "readwrite")
    const evtStore = tx.objectStore("events")
    const recStore = tx.objectStore("recordings")

    recStore.put(meta)
    for (const entry of events) {
      evtStore.put({ ...entry, recordingID: meta.id })
    }

    tx.oncomplete = () => resolve(meta.id)
    tx.onerror = () => reject(tx.error)
  })
}
