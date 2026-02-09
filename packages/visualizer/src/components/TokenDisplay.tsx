import { Show } from "solid-js"

type Tokens = {
  input: number
  output: number
  reasoning: number
  cache?: { read: number; write: number }
}

export function TokenDisplay(props: { tokens: Tokens }) {
  const t = () => props.tokens
  const total = () => t().input + t().output + t().reasoning

  return (
    <div class="inline-flex items-center gap-1.5 text-[10px] font-mono">
      <span class="text-gray-500">tokens:</span>
      <span class="text-blue-400" title="Input">{t().input.toLocaleString()}</span>
      <span class="text-gray-700">/</span>
      <span class="text-green-400" title="Output">{t().output.toLocaleString()}</span>
      <Show when={t().reasoning > 0}>
        <span class="text-gray-700">/</span>
        <span class="text-purple-400" title="Reasoning">{t().reasoning.toLocaleString()}</span>
      </Show>
      <Show when={t().cache && (t().cache!.read > 0 || t().cache!.write > 0)}>
        <span class="text-gray-600" title="Cache read/write">
          ({t().cache!.read.toLocaleString()}r/{t().cache!.write.toLocaleString()}w)
        </span>
      </Show>
      <span class="text-gray-600">= {total().toLocaleString()}</span>
    </div>
  )
}
