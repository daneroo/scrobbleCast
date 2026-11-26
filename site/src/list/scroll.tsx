import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'

// A long list drawn a step at a time, in any view: the first `first` items,
// then `step` more each time a marker after the last one comes within a
// screen of view. The marker is the "N of M" line. A new `restart` value (a
// new query) starts again: the first `first`, from the top. Nothing here
// knows what the items are.
export function Scroll({ total, first, step, restart, onMore, children }: {
  total: number
  first: number
  step: number
  restart: unknown
  // Told how many items are now wanted (never more than `total`), each time
  // more are drawn. Lists that hold every item need nothing more; one that
  // fetches its rows fetches its first `first` itself, then up to that many
  // here.
  onMore?: (wanted: number) => void
  // The list, drawing its first `shown` items.
  children: (shown: number) => ReactNode
}) {
  // How many are wanted, for the query it was counted for: a new query
  // starts again at `first` in the same render.
  const [wanted, setWanted] = useState({ restart, count: first })
  const count = Object.is(wanted.restart, restart) ? wanted.count : first
  if (!Object.is(wanted.restart, restart)) setWanted({ restart, count })

  const shown = Math.min(count, total)
  const more = shown < total
  const start = useRef<HTMLDivElement>(null)
  const marker = useRef<HTMLParagraphElement>(null)
  const tell = useRef(onMore)
  useLayoutEffect(() => { tell.current = onMore })

  // A new query: back to the top, if the list's start has scrolled away.
  const last = useRef(restart)
  useEffect(() => {
    if (Object.is(last.current, restart)) return
    last.current = restart
    if ((start.current?.getBoundingClientRect().top ?? 0) < 0) window.scrollTo({ top: 0 })
  }, [restart])

  // Watched afresh after each step, so a marker still near after drawing more
  // (a tall screen) draws more again.
  useEffect(() => {
    const target = marker.current
    if (!more || !target) return
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return
      observer.disconnect()
      setWanted({ restart, count: count + step })
      tell.current?.(Math.min(count + step, total))
    }, { rootMargin: '0px 0px 100% 0px' })
    observer.observe(target)
    return () => observer.disconnect()
  }, [more, count, step, restart, total])

  return (
    <>
      <div ref={start} />
      {children(shown)}
      {more && (
        <p ref={marker} className="mt-6 text-muted-foreground tabular-nums">
          {shown.toLocaleString()} of {total.toLocaleString()}
        </p>
      )}
    </>
  )
}
