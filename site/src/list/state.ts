import { useMemo, useState } from 'react'
import { browserStorage } from '../storage'
import { viewSetting } from './view'
import type { View } from './view'

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

// Each list's view, saved per device.
export function useListView(list: string) {
  const setting = useMemo(() => viewSetting(browserStorage, list), [list])
  const [view, setView] = useState(setting.get)
  function set(next: View) {
    setting.set(next)
    setView(next)
  }
  return [view, set] as const
}
