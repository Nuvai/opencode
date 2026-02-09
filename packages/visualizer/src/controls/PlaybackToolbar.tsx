import { PlayPauseButton } from "./PlayPauseButton"
import { SpeedSelector } from "./SpeedSelector"
import { TimelineScrubber } from "./TimelineScrubber"
import { EventCounter } from "./EventCounter"
import { ModeToggle } from "./ModeToggle"
import { ViewToggle } from "./ViewToggle"
import { SessionSelector } from "./SessionSelector"
import { RecordingSelector } from "./RecordingSelector"

export function PlaybackToolbar() {
  return (
    <div class="flex items-center gap-3 px-4 py-2 border-t border-gray-800 bg-gray-950/90 backdrop-blur-sm shrink-0">
      <PlayPauseButton />
      <SpeedSelector />
      <TimelineScrubber />
      <EventCounter />

      <div class="w-px h-4 bg-gray-800" />

      <ViewToggle />
      <ModeToggle />
      <SessionSelector />
      <RecordingSelector />
    </div>
  )
}
