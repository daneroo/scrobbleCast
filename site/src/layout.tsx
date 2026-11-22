import { HeadContent, Link, Outlet, useRouter } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import { version } from '../package.json'

export function Layout() {
  const content = useRef<HTMLElement>(null)
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
      <main className="content" ref={content}><Outlet /></main>
      <Footer content={content} />
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

// Shows when the page content last changed: navigation, data loading, search,
// sorting or "Show more". A placeholder until the footer can show how fresh the
// upstream data is.
function Footer({ content }: { content: RefObject<HTMLElement | null> }) {
  const [updatedAt, setUpdatedAt] = useState(() => new Date())
  useEffect(() => {
    if (!content.current) return
    const observer = new MutationObserver(() => setUpdatedAt(new Date()))
    observer.observe(content.current, { childList: true, subtree: true, characterData: true })
    return () => observer.disconnect()
  }, [content])
  return (
    <footer className="site-footer">
      <span>Scrobble Cast v{version}</span>
      {/* The sv-SE locale formats local time as "YYYY-MM-DD HH:mm:ss". */}
      <time dateTime={updatedAt.toISOString()}>{updatedAt.toLocaleString('sv-SE')}</time>
    </footer>
  )
}
