import { HeadContent, Link, Outlet, useMatches, useRouter } from '@tanstack/react-router'
import { useSyncExternalStore } from 'react'
import type { ReactNode } from 'react'
import { version } from '../package.json'
import { feedTitles, getShownCopies, subscribeShownCopies } from './data/fetch'
import { localTime } from './format'
import { notices } from './notices'
import type { Notice } from './notices'
import { Button, Heading, Panel, classes } from './ui'

// The width and side margins of the header and the page's content.
const container = 'mx-auto w-full max-w-6xl px-4 sm:px-8 lg:px-12'

export function Layout() {
  return (
    <>
      <HeadContent />
      <header className="bg-header text-header-foreground">
        <div className={classes(container, 'flex min-h-18 flex-wrap items-center justify-between gap-4 py-2.5')}>
          <Link to="/" className={classes(headerLink, 'flex items-center gap-2.5 text-[1.05rem] font-bold whitespace-nowrap')}>
            <BrandMark />
            Scrobble Cast
          </Link>
          <nav aria-label="Main" className="flex items-center gap-0.5 sm:gap-2 lg:gap-3.5">
            <NavLink to="/books">Books</NavLink>
            <NavLink to="/podcasts">Podcasts</NavLink>
            <NavLink to="/episodes">Episodes</NavLink>
          </nav>
        </div>
      </header>
      <NoticeArea />
      <main className={classes(container, 'py-6 sm:py-10 lg:py-16')}><Outlet /></main>
      <Footer />
    </>
  )
}

// Links in the header take its colours, not the page's.
const headerLink = 'text-inherit no-underline focus-visible:outline-header-ring'

// The icon as a stencil filled with --header-mark: an <img> can't be
// recoloured. As wide as the mark's ink (52.3 of the icon's 88 units at
// 42px), so the gap is measured from it.
function BrandMark() {
  return (
    <span
      aria-hidden="true"
      className="h-10.5 w-6.25 bg-header-mark mask-[url(/scrobble-cast-icon.svg)] mask-size-[auto_100%] mask-center mask-no-repeat"
    />
  )
}

function NavLink({ to, children }: { to: '/books' | '/podcasts' | '/episodes'; children: ReactNode }) {
  return (
    <Link
      to={to}
      className={classes(
        headerLink,
        'rounded-md px-2 py-1.5 text-sm decoration-header-active hover:bg-header-hover hover:underline',
        'data-[status=active]:bg-header-hover data-[status=active]:underline',
      )}
    >
      {children}
    </Link>
  )
}

export function NotFound() {
  return (
    <Panel>
      <Heading className="mb-3">Page not found</Heading>
      <Link to="/">Back to Scrobble Cast</Link>
    </Panel>
  )
}

export function LoadError({ error, reset }: { error: unknown; reset: () => void }) {
  const router = useRouter()
  return (
    <Panel role="alert">
      <Heading className="mb-3">Couldn’t load this page</Heading>
      <p className="mb-4 whitespace-pre-line">{error instanceof Error ? error.message : String(error)}</p>
      <Button onClick={() => { reset(); void router.invalidate() }}>Try again</Button>
    </Panel>
  )
}

const noticeColours: Record<Notice['kind'], string> = {
  info: 'bg-notice-info',
  warning: 'bg-notice-warning',
}

// A thin bar of notices under the site header, each with × to dismiss it.
// Nothing while there are none.
function NoticeArea() {
  const shown = Object.entries(useSyncExternalStore(notices.subscribe, notices.get))
  if (shown.length === 0) return null
  return (
    <ul className="text-sm" aria-label="Notices">
      {shown.map(([key, { kind, text }]) => (
        <li
          key={key}
          className={classes('flex items-center justify-center gap-3 border-b px-4 py-1.5', noticeColours[kind])}
          role={kind === 'warning' ? 'alert' : 'status'}
        >
          <span>{text}</span>
          <button
            type="button"
            aria-label="Dismiss"
            className="rounded-sm px-1.5 text-lg leading-none hover:bg-hover"
            onClick={() => notices.clear(key)}
          >
            ×
          </button>
        </li>
      ))}
    </ul>
  )
}

// Lists each feed the page shows, with its time once it has loaded, marked
// `(saved)` while its saved copy is shown.
function Footer() {
  const feeds = useMatches().flatMap((match) => match.staticData.feeds ?? [])
  const shown = useSyncExternalStore(subscribeShownCopies, getShownCopies)
  return (
    <footer className="flex flex-wrap justify-center gap-x-4 gap-y-1 border-t p-4 text-sm text-muted-foreground tabular-nums">
      <span>Scrobble Cast v{version}</span>
      {feeds.length > 0 && (
        <ul className="contents" aria-label="Feeds">
          {feeds.map((feed) => {
            const copy = shown[feed]
            if (!copy) return null
            const { time } = copy
            return (
              <li key={feed}>
                {feedTitles[feed]} {time.label}{' '}
                {time.at ? <time dateTime={time.at.toISOString()}>{localTime(time.at)}</time> : '—'}
                {copy.source === 'saved' && ' (saved)'}
              </li>
            )
          })}
        </ul>
      )}
    </footer>
  )
}
