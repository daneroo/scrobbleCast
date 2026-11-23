import { HeadContent, Link, Outlet, useMatches, useRouter } from '@tanstack/react-router'
import { useSyncExternalStore } from 'react'
import { version } from '../package.json'
import { feedTitles, getShownCopies, subscribeShownCopies } from './data/fetch'
import { localTime } from './format'
import { notices } from './notices'

export function Layout() {
  return (
    <>
      <HeadContent />
      <header className="site-header">
        <div className="header-content">
          <Link to="/" className="brand">
            <img src="/scrobble-cast-icon.svg" alt="" width="42" height="42" />
            Scrobble Cast
          </Link>
          <nav aria-label="Main">
            <Link to="/books">Books</Link>
            <Link to="/podcasts">Podcasts</Link>
            <Link to="/episodes">Episodes</Link>
          </nav>
        </div>
      </header>
      <NoticeArea />
      <main className="content"><Outlet /></main>
      <Footer />
    </>
  )
}

export function NotFound() {
  return (
    <section className="empty">
      <h1>Page not found</h1>
      <Link to="/">Back to Scrobble Cast</Link>
    </section>
  )
}

export function LoadError({ error, reset }: { error: unknown; reset: () => void }) {
  const router = useRouter()
  return (
    <section className="empty" role="alert">
      <h1>Couldn’t load this page</h1>
      <p>{error instanceof Error ? error.message : String(error)}</p>
      <button className="button" type="button" onClick={() => { reset(); void router.invalidate() }}>Try again</button>
    </section>
  )
}

// A thin bar of notices under the site header, each with × to dismiss it.
// Nothing while there are none.
function NoticeArea() {
  const shown = Object.entries(useSyncExternalStore(notices.subscribe, notices.get))
  if (shown.length === 0) return null
  return (
    <ul className="notices" aria-label="Notices">
      {shown.map(([key, { kind, text }]) => (
        <li key={key} className={`notice notice-${kind}`} role={kind === 'warning' ? 'alert' : 'status'}>
          <span>{text}</span>
          <button type="button" aria-label="Dismiss" onClick={() => notices.clear(key)}>×</button>
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
    <footer className="site-footer">
      <span>Scrobble Cast v{version}</span>
      {feeds.length > 0 && (
        <ul className="feed-times" aria-label="Feeds">
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
