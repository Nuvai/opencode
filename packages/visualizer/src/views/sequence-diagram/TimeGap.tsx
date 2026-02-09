import { formatGap } from "@/utils/time-format"

export function TimeGap(props: { gapMs: number }) {
  const text = () => formatGap(props.gapMs)

  return (
    <div class="flex items-center gap-2 py-0.5 px-2">
      <div class="flex-1 border-t border-dashed border-gray-800" />
      <span class="text-[9px] text-gray-600 font-mono shrink-0">{text()}</span>
      <div class="flex-1 border-t border-dashed border-gray-800" />
    </div>
  )
}
