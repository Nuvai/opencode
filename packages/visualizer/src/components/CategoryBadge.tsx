import type { Category } from "@/pipeline/actor-model"
import { CATEGORY_COLORS } from "@/utils/color"

const CATEGORY_LABELS: Record<Category, string> = {
  message: "Message",
  tool: "Tool",
  token: "Token",
  control: "Control",
  error: "Error",
  permission: "Permission",
}

export function CategoryBadge(props: { category: Category }) {
  return (
    <span
      class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide"
      style={{
        "background-color": CATEGORY_COLORS[props.category] + "22",
        color: CATEGORY_COLORS[props.category],
        border: `1px solid ${CATEGORY_COLORS[props.category]}44`,
      }}
    >
      {CATEGORY_LABELS[props.category]}
    </span>
  )
}
