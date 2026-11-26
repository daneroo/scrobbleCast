import { useCallback, useMemo, useState, useSyncExternalStore } from 'react'
import { browserStorage } from '../storage'
import { narrowQuery, viewOn, viewSetting } from './view'
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

// Each list's view, saved per device, and whether the screen is narrow; the
// view returned is the one this screen shows (see `viewOn`).
export function useListView(list: string) {
  const setting = useMemo(() => viewSetting(browserStorage, list), [list])
  const [view, setView] = useState(setting.get)
  const narrow = useMedia(narrowQuery)
  function set(next: View) {
    setting.set(next)
    setView(next)
  }
  return [viewOn(view, narrow), set, narrow] as const
}

// Whether a media query matches, following changes (e.g. a phone turned).
function useMedia(query: string) {
  const subscribe = useCallback((onChange: () => void) => {
    const media = matchMedia(query)
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [query])
  return useSyncExternalStore(subscribe, () => matchMedia(query).matches)
}
