import { Await } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { windowStepDays } from '../config'
import { widen, type EpisodeFeed } from '../data/podcasts'
import { localDay } from '../format'
import { Loading, classes } from '../ui'

// The Window line, under a list's heading: how far back the episode feed
// reaches, how many episodes it holds, and the button that widens it, e.g.
// "Since 2026-10-26 · 1,312 episodes · +30 days". `note` follows it: the
// podcasts list says what counts the Window. Widening is only ever this
// click, never a scroll.
export function WindowLine({ episodes, note }: { episodes: Promise<EpisodeFeed>; note?: ReactNode }) {
  return (
    <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-muted-foreground">
      <Await promise={episodes} fallback={<Loading />}>
        {({ since, data }) => (
          <>
            <span>Since <time dateTime={since.toISOString()}>{localDay(since)}</time></span>
            <span aria-hidden="true">·</span>
            <span>{data.length.toLocaleString()} {data.length === 1 ? 'episode' : 'episodes'}</span>
            <span aria-hidden="true">·</span>
            <WidenButton />
          </>
        )}
      </Await>
      {note}
    </p>
  )
}

// "+30 days", or that it's loading while a widening is under way, even one
// started before this page opened. A failure posts a notice (the data's
// doing) and leaves the button ready to try again. A click while loading
// joins the widening under way.
function WidenButton() {
  const [pending, setPending] = useState(widen.pending)
  useEffect(() => {
    if (!pending) return
    let shown = true
    void pending.then(() => { if (shown) setPending(undefined) })
    return () => { shown = false }
  }, [pending])
  return (
    <button
      type="button"
      aria-disabled={pending ? true : undefined}
      className={classes('rounded-md border bg-card px-2.5 py-0.5 text-sm text-foreground hover:bg-hover', pending && 'animate-pulse motion-reduce:animate-none')}
      onClick={() => setPending(widen())}
    >
      {pending ? `Loading ${windowStepDays} more days…` : `+${windowStepDays} days`}
    </button>
  )
}
