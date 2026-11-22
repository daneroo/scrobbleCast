import { HeadContent, Link, Outlet, useRouter } from '@tanstack/react-router'

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
      <main className="content"><Outlet /></main>
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
