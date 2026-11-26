// A list's view setting (glossary: View): table, small cards or large cards,
// saved per device in localStorage, like the theme setting. Each list has its
// own.

export const views = ['table', 'small', 'large'] as const
export type View = (typeof views)[number]
// A card view's size.
export type CardSize = Exclude<View, 'table'>

const fallback: View = 'table'

// A narrow screen (a phone held upright, below Tailwind's `sm`) has no room
// for large cards: it shows small ones instead, and its switch offers only
// the other views. The setting itself is kept, so turning the phone sideways
// brings the large cards back.
export const narrowQuery = '(width < 40rem)'

export function viewsOn(narrow: boolean): readonly View[] {
  return narrow ? views.filter((view) => view !== 'large') : views
}

export function viewOn(view: View, narrow: boolean): View {
  return viewsOn(narrow).includes(view) ? view : 'small'
}

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
