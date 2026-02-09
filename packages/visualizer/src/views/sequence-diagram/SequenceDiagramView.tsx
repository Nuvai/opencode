import { SwimLaneHeaders } from "./SwimLaneHeaders"
import { SequenceBody } from "./SequenceBody"

export function SequenceDiagramView() {
  return (
    <div class="flex flex-col h-full">
      <SwimLaneHeaders />
      <SequenceBody />
    </div>
  )
}
