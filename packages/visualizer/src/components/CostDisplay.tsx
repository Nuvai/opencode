export function CostDisplay(props: { cost: number }) {
  const formatted = () => {
    const c = props.cost
    if (c < 0.001) return `$${c.toFixed(6)}`
    if (c < 0.01) return `$${c.toFixed(5)}`
    if (c < 1) return `$${c.toFixed(4)}`
    return `$${c.toFixed(2)}`
  }

  return (
    <span class="inline-flex items-center text-[10px] font-mono text-yellow-400" title={`$${props.cost}`}>
      {formatted()}
    </span>
  )
}
