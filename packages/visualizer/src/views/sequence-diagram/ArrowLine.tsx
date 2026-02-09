import type { Actor } from "@/pipeline/actor-model"
import { CATEGORY_COLORS } from "@/utils/color"
import { ACTOR_COLUMNS, COLUMN_WIDTH } from "./SwimLaneHeaders"
import type { Category } from "@/pipeline/actor-model"

const ROW_HEIGHT = 36
const ARROW_SIZE = 6

export function ArrowLine(props: { from: Actor; to: Actor; category: Category; label: string; isLatest?: boolean }) {
  const fromCol = () => ACTOR_COLUMNS[props.from]
  const toCol = () => ACTOR_COLUMNS[props.to]

  const isSelf = () => fromCol() === toCol()
  const leftCol = () => Math.min(fromCol(), toCol())
  const rightCol = () => Math.max(fromCol(), toCol())
  const goesRight = () => fromCol() < toCol()

  const color = () => CATEGORY_COLORS[props.category]
  const opacity = () => props.isLatest ? 1 : 0.7

  if (isSelf()) {
    // Self-loop: curved arrow
    const cx = () => fromCol() * COLUMN_WIDTH + COLUMN_WIDTH / 2
    return (
      <svg class="absolute inset-0" style={{ height: `${ROW_HEIGHT}px`, overflow: "visible" }}>
        <path
          d={`M ${cx()} 10 C ${cx() - 30} -8, ${cx() + 30} -8, ${cx()} 10`}
          fill="none"
          stroke={color()}
          stroke-width={props.isLatest ? 2 : 1.5}
          opacity={opacity()}
        />
        <text
          x={cx()}
          y={ROW_HEIGHT / 2 + 4}
          text-anchor="middle"
          fill={color()}
          font-size="10"
          opacity={opacity()}
          class="font-mono"
        >
          {props.label}
        </text>
      </svg>
    )
  }

  const x1 = () => fromCol() * COLUMN_WIDTH + COLUMN_WIDTH / 2
  const x2 = () => toCol() * COLUMN_WIDTH + COLUMN_WIDTH / 2
  const midX = () => (x1() + x2()) / 2
  const y = ROW_HEIGHT / 2

  return (
    <svg class="absolute inset-0" style={{ height: `${ROW_HEIGHT}px`, overflow: "visible" }}>
      {/* Arrow line */}
      <line
        x1={x1()}
        y1={y}
        x2={x2()}
        y2={y}
        stroke={color()}
        stroke-width={props.isLatest ? 2 : 1.5}
        opacity={opacity()}
      />
      {/* Arrowhead */}
      <polygon
        points={
          goesRight()
            ? `${x2() - ARROW_SIZE},${y - ARROW_SIZE / 2} ${x2()},${y} ${x2() - ARROW_SIZE},${y + ARROW_SIZE / 2}`
            : `${x2() + ARROW_SIZE},${y - ARROW_SIZE / 2} ${x2()},${y} ${x2() + ARROW_SIZE},${y + ARROW_SIZE / 2}`
        }
        fill={color()}
        opacity={opacity()}
      />
      {/* Label */}
      <text
        x={midX()}
        y={y - 6}
        text-anchor="middle"
        fill={color()}
        font-size="10"
        opacity={opacity()}
        class="font-mono"
      >
        {props.label}
      </text>
    </svg>
  )
}
