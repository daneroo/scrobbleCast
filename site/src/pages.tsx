import { Link } from '@tanstack/react-router'
import { recentDays } from './config'
import type { Book } from './data/books'
import type { Feed } from './data/fetch'
import type { Episode, Podcast } from './data/podcasts'
import { FeedCount, classes } from './ui'

// Home. Each list's page, and each record's, lives in its list's folder.

export function Home({ feeds }: {
  feeds: { books: Promise<Feed<Book[]>>; podcasts: Promise<Feed<Podcast[]>>; episodes: Promise<Feed<Episode[]>> }
}) {
  const sections = [
    {
      to: '/books', title: 'Books', label: 'read', border: 'border-t-books',
      count: <FeedCount feed={feeds.books} count={(books) => books.filter((book) => book.userShelf === 'read').length} />,
    },
    {
      to: '/podcasts', title: 'Podcasts', label: 'in the catalog', border: 'border-t-podcasts',
      count: <FeedCount feed={feeds.podcasts} count={(podcasts) => podcasts.length} />,
    },
    {
      to: '/episodes', title: 'Episodes', label: `played in the last ${recentDays} days`, border: 'border-t-episodes',
      count: <FeedCount feed={feeds.episodes} count={(episodes) => episodes.filter((episode) => episode.playedSeconds > 0).length} />,
    },
  ] as const

  return (
    <>
      {/* Stacked on phones, the logo above the title; side by side from sm. */}
      <section className="flex flex-col-reverse gap-6 rounded-3xl border bg-hero p-6 sm:flex-row sm:items-center sm:justify-between sm:p-10 lg:p-14">
        <div className="min-w-0">
          <h1 className="text-5xl leading-none font-bold tracking-tighter text-hero-title sm:text-6xl lg:text-7xl xl:text-8xl">
            Scrobble Cast
          </h1>
          <p className="mt-4 text-lg text-hero-subtitle sm:mt-6 sm:text-xl">What my eyes and ears have been up to.</p>
        </div>
        <img src="/scrobble-cast.svg" alt="" width="180" height="180" className="w-22 shrink-0 rounded-xl sm:w-36 lg:w-45" />
      </section>
      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        {sections.map(({ to, title, count, label, border }) => (
          <Link
            key={to}
            to={to}
            className={classes('group grid gap-1.5 rounded-xl border border-t-4 bg-card p-4 text-inherit no-underline hover:shadow-card sm:p-6', border)}
          >
            {/* The underline is the hover cue that survives forced colours, where the shadow is dropped. */}
            <span className="flex justify-between font-bold text-accent">
              <span className="group-hover:underline">{title}</span>
              <span aria-hidden="true">↗</span>
            </span>
            <strong className="text-4xl leading-tight tracking-tighter sm:text-5xl lg:text-6xl">{count}</strong>
            <span className="text-muted-foreground">{label}</span>
          </Link>
        ))}
      </div>
    </>
  )
}
