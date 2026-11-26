// A list's view setting (glossary: View): table, small cards or large cards,
// saved per device in localStorage, like the theme setting. Each list has its
// own.

export const views = ['table', 'small', 'large'] as const
export type View = (typeof views)[number]

const fallback: View = 'table'

// Storage may throw (e.g. when the browser blocks it): reading then gives the
// table, and a choice holds for this page only.
export function viewSetting(storage: Pick<Storage, 'getItem' | 'setItem'>, list: string) {
  const key = `scrobble-cast:${list}:view`
  let view = fallback
  try {
    const saved = storage.getItem(key)
    view = views.find((name) => name === saved) ?? fallback
  } catch {
    // Nothing saved.
  }
  return {
    get: () => view,
    set(next: View) {
      view = next
      try {
        storage.setItem(key, next)
      } catch {
        // Not saved.
      }
    },
  }
}
