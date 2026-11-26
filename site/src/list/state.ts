import { useMemo, useState } from 'react'
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

// localStorage, reached on each use: reaching it can itself throw (e.g. when
// the browser blocks storage), where the view setting catches it.
const storage: Pick<Storage, 'getItem' | 'setItem'> = {
  getItem: (key) => localStorage.getItem(key),
  setItem: (key, value) => localStorage.setItem(key, value),
}

// Each list's view, saved per device.
export function useListView(list: string) {
  const setting = useMemo(() => viewSetting(storage, list), [list])
  const [view, setView] = useState(setting.get)
  function set(next: View) {
    setting.set(next)
    setView(next)
  }
  return [view, set] as const
}
