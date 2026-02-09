export type Point = { x: number; y: number }

export function cubicBezierPath(from: Point, to: Point): string {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const cx = Math.abs(dx) * 0.4
  const cy = Math.abs(dy) * 0.2

  // Self-loop (from === to)
  if (Math.abs(dx) < 1 && Math.abs(dy) < 1) {
    return `M ${from.x} ${from.y} C ${from.x - 40} ${from.y - 50}, ${from.x + 40} ${from.y - 50}, ${to.x} ${to.y}`
  }

  return `M ${from.x} ${from.y} C ${from.x + cx} ${from.y + cy}, ${to.x - cx} ${to.y - cy}, ${to.x} ${to.y}`
}

export function midpoint(from: Point, to: Point): Point {
  return { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 }
}

export function distance(from: Point, to: Point): number {
  return Math.sqrt((to.x - from.x) ** 2 + (to.y - from.y) ** 2)
}
