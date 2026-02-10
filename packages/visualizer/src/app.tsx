import { Show, Switch, Match, createSignal } from "solid-js"
import { ConnectionProvider } from "@/context/connection"
import { TimelineProvider, useTimeline } from "@/context/timeline"
import { PlaybackEngine } from "@/context/playback-engine"
import { ConnectionStatus } from "@/components/ConnectionStatus"
import { EventDetailPanel } from "@/components/EventDetailPanel"
import { PlaybackToolbar } from "@/controls/PlaybackToolbar"
import { KeyboardShortcuts } from "@/controls/KeyboardShortcuts"
import { SearchFilterBar } from "@/controls/SearchFilterBar"
import { SequenceDiagramView } from "@/views/sequence-diagram/SequenceDiagramView"
import { FlowGraphView } from "@/views/flow-graph/FlowGraphView"
import { TimelineView } from "@/views/timeline/TimelineView"
import { StatsView } from "@/views/stats/StatsView"
import { SankeyView } from "@/views/sankey/SankeyView"
import { ConversationView } from "@/views/conversation/ConversationView"
import { RecordingsList } from "@/views/recordings/RecordingsList"

function MainView() {
  const tl = useTimeline()
  const [showRecordings, setShowRecordings] = createSignal(false)

  return (
    <div class="flex flex-col h-full">
      {/* Header */}
      <header class="flex items-center justify-between px-4 py-2 border-b border-gray-800 bg-gray-950/80 backdrop-blur-sm shrink-0">
        <div class="flex items-center gap-3">
          <h1 class="text-sm font-semibold text-gray-200 tracking-tight">OpenCode Visualizer</h1>
          <span class="text-[10px] text-gray-600 font-mono">v0.0.1</span>
          <button
            class="text-[10px] text-gray-500 hover:text-gray-300 px-1.5 py-0.5 rounded border border-gray-800 hover:border-gray-700"
            onClick={() => setShowRecordings(true)}
          >
            Recordings
          </button>
        </div>
        <ConnectionStatus />
      </header>

      <SearchFilterBar />

      {/* Main content */}
      <div class="flex-1 min-h-0 overflow-hidden">
        <Switch>
          <Match when={tl.activeView() === "sequence"}>
            <SequenceDiagramView />
          </Match>
          <Match when={tl.activeView() === "flow"}>
            <FlowGraphView />
          </Match>
          <Match when={tl.activeView() === "timeline"}>
            <TimelineView />
          </Match>
          <Match when={tl.activeView() === "stats"}>
            <StatsView />
          </Match>
          <Match when={tl.activeView() === "sankey"}>
            <SankeyView />
          </Match>
          <Match when={tl.activeView() === "conversation"}>
            <ConversationView />
          </Match>
        </Switch>
      </div>

      {/* Playback controls */}
      <PlaybackToolbar />

      {/* Recordings modal */}
      <Show when={showRecordings()}>
        <RecordingsList onClose={() => setShowRecordings(false)} />
      </Show>

      <EventDetailPanel />
      <KeyboardShortcuts />

      {/* Playback engine (invisible, just runs effects) */}
      <PlaybackEngine />
    </div>
  )
}

export function App() {
  let appendEntry: ((entry: any) => void) | null = null

  return (
    <TimelineProvider>
      <TimelineConsumerBridge onReady={(fn) => (appendEntry = fn)} />
      <ConnectionProvider onEntry={(entry) => appendEntry?.(entry)}>
        <MainView />
      </ConnectionProvider>
    </TimelineProvider>
  )
}

/** Bridge component that extracts the append function from timeline context */
function TimelineConsumerBridge(props: { onReady: (fn: (entry: any) => void) => void }) {
  const tl = useTimeline()
  props.onReady(tl.append)
  return null
}
