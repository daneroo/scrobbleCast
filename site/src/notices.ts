// A notice shown in the bar under the site header, e.g. a feed that failed to
// refresh.
export interface Notice {
  kind: 'info' | 'warning'
  text: string
}

// The notices shown now, one per key (e.g. per feed): any part of the app can
// post or clear one. Listeners hear every change.
export function noticeBoard() {
  let shown: Readonly<Record<string, Notice>> = {}
  const listeners = new Set<() => void>()
  const change = (next: Record<string, Notice>) => {
    shown = next
    for (const listener of listeners) listener()
  }
  return {
    get: () => shown,
    post(key: string, notice: Notice) {
      change({ ...shown, [key]: notice })
    },
    clear(key: string) {
      if (!(key in shown)) return
      const { [key]: _, ...rest } = shown
      change(rest)
    },
    subscribe(listener: () => void) {
      listeners.add(listener)
      return () => { listeners.delete(listener) }
    },
  }
}

export type NoticeBoard = ReturnType<typeof noticeBoard>

// The app's notices, shown by the notice area.
export const notices = noticeBoard()
