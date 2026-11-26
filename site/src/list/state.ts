import { useState } from 'react'

// Each list's query text, kept for the tab: it survives opening a record and
// coming back, not a reload.
const queries = new Map<string, string>()

export function useListQuery(list: string) {
  const [text, setText] = useState(() => queries.get(list) ?? '')
  function set(next: string) {
    queries.set(list, next)
    setText(next)
  }
  return [text, set] as const
}
