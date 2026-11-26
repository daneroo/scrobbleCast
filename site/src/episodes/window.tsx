import { Await, CatchBoundary } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { windowStepDays } from '../config'
import { widen, type EpisodeFeed } from '../data/podcasts'
import { localDay } from '../format'
import { Loading, classes } from '../ui'

const windowButton = 'rounded-md border bg-card px-2.5 py-0.5 text-sm text-foreground hover:bg-hover'

// The Window line, under a list's heading: how far back the episode feed
// reaches, how many episodes it holds, and the button that widens it, e.g.
// "Since 2026-10-26 · 1,312 episodes · +30 days". `note` follows it: the
// podcasts list says what counts the Window. Widening is only ever this
// click, never a scroll.
export function WindowLine({ episodes, note, retry }: { episodes: Promise<EpisodeFeed>; note?: ReactNode; retry?: () => void }) {
  const summary = (
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
  )
  return (
    <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-muted-foreground">
      {retry ? (
        <CatchBoundary
          getResetKey={() => episodes}
          errorComponent={() => (
            <>
              <span role="status">Couldn’t load the episode window.</span>
              <button type="button" className={windowButton} onClick={retry}>Retry episode window</button>
            </>
          )}
        >
          {summary}
        </CatchBoundary>
      ) : summary}
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
      className={classes(windowButton, pending && 'animate-pulse motion-reduce:animate-none')}
      onClick={() => setPending(widen())}
    >
      {pending ? `Loading ${windowStepDays} more days…` : `+${windowStepDays} days`}
    </button>
  )
}
