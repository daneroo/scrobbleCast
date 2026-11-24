import { Await, Link, notFound } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { episodePageSize, episodePageStep, recentDays } from './config'
import type { Book } from './data/books'
import type { Feed } from './data/fetch'
import type { Episode, Podcast } from './data/podcasts'
import { day, documentTitle, playedPercent } from './format'
import { search } from './search'
import { Table } from './table'
import { Button, Field, Heading, Panel, classes, control } from './ui'
import type { Column } from './table'

const bookKeys = ['title', 'authorName', 'bookDescription']
const podcastKeys = ['title', 'author', 'description']
const episodeKeys = ['title', 'podcastTitle']
const shelfLabels: Record<string, string> = {
  'currently-reading': 'Currently reading',
  'to-read': 'To read',
  'on-deck': 'On deck',
  'did-not-finish': 'Did not finish',
  read: 'Read',
}

function shelfName(shelf: string) {
  return shelfLabels[shelf] ?? shelf
}

// The shelf shown until one is picked.
function defaultShelf(books: Book[]) {
  return books.some((book) => book.userShelf === 'currently-reading') ? 'currently-reading' : ''
}

const bookColumns: Column<Book>[] = [
  {
    label: 'Title',
    value: (book) => book.title,
    render: (book) => <Link to="/books/$bookId" params={{ bookId: book.bookId }}>{book.title}</Link>,
  },
  { label: 'Author', value: (book) => book.authorName },
  { label: 'Shelf', value: (book) => shelfName(book.userShelf) },
  { label: 'Last read', value: (book) => book.userLastReadAt, render: (book) => day(book.userLastReadAt) },
]

const podcastColumns: Column<Podcast>[] = [
  {
    label: 'Title',
    value: (podcast) => podcast.title,
    render: (podcast) => <Link to="/podcasts/$uuid" params={{ uuid: podcast.uuid }}>{podcast.title}</Link>,
  },
  { label: 'Author', value: (podcast) => podcast.author },
  { label: 'Since', value: (podcast) => podcast.firstSeen, render: (podcast) => day(podcast.firstSeen) },
]

const episodeColumns: Column<Episode>[] = [
  {
    label: 'Title',
    value: (episode) => episode.title,
    render: (episode) => <Link to="/episodes/$uuid" params={{ uuid: episode.uuid }}>{episode.title}</Link>,
  },
  {
    label: 'Podcast',
    value: (episode) => episode.podcastTitle,
    render: (episode) => episode.podcastId && episode.podcastTitle
      ? <Link to="/podcasts/$uuid" params={{ uuid: episode.podcastId }}>{episode.podcastTitle}</Link>
      : episode.podcastTitle || '—',
  },
  { label: 'Played', value: playedPercent, render: (episode) => playedPercent(episode) + '%' },
  { label: 'Last played', value: (episode) => episode.lastPlayed, render: (episode) => day(episode.lastPlayed) },
]

// Pages show their static part at once. Each data part waits for its feed in
// `<Await>`, showing a small placeholder until then.
function Loading({ block = false }: { block?: boolean }) {
  return block
    ? <Panel role="status">Loading…</Panel>
    : <span className="animate-pulse text-muted-foreground motion-reduce:animate-none" role="status" aria-label="Loading">…</span>
}

// The data part of a detail page: the record once it has loaded, or not found.
function Found<T>({ record, children }: { record: Promise<T | undefined>; children: (record: T) => ReactNode }) {
  return (
    <Await promise={record} fallback={<Loading block />}>
      {(found) => {
        if (found === undefined) throw notFound()
        return children(found)
      }}
    </Await>
  )
}

// The route's head gives a detail page a generic title until its record loads.
function usePageTitle(title: string) {
  useEffect(() => { document.title = documentTitle(title) }, [title])
}

function SearchBox({ value, onChange, label }: { value: string; onChange: (value: string) => void; label: string }) {
  return (
    <Field label={label} className="min-w-[min(100%,16rem)] flex-1">
      <input type="search" className={control} value={value} onChange={(event) => onChange(event.target.value)} />
    </Field>
  )
}

// The search box and filters above a list.
function Controls({ children }: { children: ReactNode }) {
  return <div className="mb-4 flex flex-wrap items-end gap-x-4 gap-y-3">{children}</div>
}

// A count from a feed, once the feed has loaded.
function FeedCount<T>({
  feed, count, unit,
}: { feed: Promise<Feed<T>>; count: (data: T) => number; unit?: [one: string, many: string] }) {
  return (
    <Await promise={feed} fallback={<Loading />}>
      {({ data }) => {
        const n = count(data)
        return unit ? `${n.toLocaleString()} ${n === 1 ? unit[0] : unit[1]}` : n.toLocaleString()
      }}
    </Await>
  )
}

// A list page: its title and the number of results from its feed.
function Collection<T>({
  title, feed, results, children,
}: { title: string; feed: Promise<Feed<T>>; results: (data: T) => unknown[]; children: ReactNode }) {
  return (
    <>
      <header className="mb-5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
        <Heading>{title}</Heading>
        <p className="text-muted-foreground tabular-nums" aria-live="polite"><FeedCount feed={feed} count={(data) => results(data).length} unit={['result', 'results']} /></p>
      </header>
      {children}
    </>
  )
}

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
      <section className="flex items-start justify-between gap-6 rounded-3xl border bg-hero p-6 sm:items-center sm:p-10 lg:p-14">
        <div>
          <h1 className="text-5xl leading-none font-bold tracking-tighter text-hero-title sm:text-6xl lg:text-7xl xl:text-8xl">
            Scrobble Cast
          </h1>
          <p className="mt-4 text-lg text-hero-subtitle sm:mt-6 sm:text-xl">What my eyes and ears have been up to.</p>
        </div>
        <img src="/scrobble-cast.svg" alt="" width="180" height="180" className="mt-1 w-22 rounded-xl sm:mt-0 sm:w-36 lg:w-45" />
      </section>
      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        {sections.map(({ to, title, count, label, border }) => (
          <Link
            key={to}
            to={to}
            className={classes('grid gap-1.5 rounded-xl border border-t-4 bg-card p-4 text-inherit no-underline hover:shadow-card sm:p-6', border)}
          >
            <span className="flex justify-between font-bold text-accent">{title}<span aria-hidden="true">↗</span></span>
            <strong className="text-4xl leading-tight tracking-tighter sm:text-5xl lg:text-6xl">{count}</strong>
            <span className="text-muted-foreground">{label}</span>
          </Link>
        ))}
      </div>
    </>
  )
}

export function Books({ books }: { books: Promise<Feed<Book[]>> }) {
  const [query, setQuery] = useState('')
  const [shelf, setShelf] = useState<string>()
  // The first copy shown sets the default shelf, so a fresh copy replacing a
  // saved copy doesn't change the view.
  useEffect(() => {
    books.then(({ data }) => setShelf((shelf) => shelf ?? defaultShelf(data)), () => {})
  }, [books])
  const results = (books: Book[]) => {
    const shown = shelf ?? defaultShelf(books)
    return search(books, bookKeys, query).filter((book) => !shown || book.userShelf === shown)
  }

  return (
    <Collection title="Books" feed={books} results={results}>
      <Controls>
        <SearchBox value={query} onChange={setQuery} label="Search books" />
        <Field label="Shelf">
          <Await promise={books} fallback={<select className={classes(control, 'min-w-44')} disabled><option>All shelves</option></select>}>
            {({ data }) => {
              const shown = shelf ?? defaultShelf(data)
              // A fresh copy may have no book left on the shelf shown.
              const shelves = new Set([...data.map((book) => book.userShelf), ...(shown ? [shown] : [])])
              return (
                <select className={classes(control, 'min-w-44')} value={shown} onChange={(event) => setShelf(event.target.value)}>
                  <option value="">All shelves</option>
                  {[...shelves].map((name) => <option key={name} value={name}>{shelfName(name)}</option>)}
                </select>
              )
            }}
          </Await>
        </Field>
      </Controls>
      <Await promise={books} fallback={<Loading block />}>
        {({ data }) => <Table items={results(data)} columns={bookColumns} id={(book) => book.bookId} />}
      </Await>
    </Collection>
  )
}

export function Podcasts({ podcasts }: { podcasts: Promise<Feed<Podcast[]>> }) {
  const [query, setQuery] = useState('')
  const results = (podcasts: Podcast[]) => search(podcasts, podcastKeys, query)
  return (
    <Collection title="Podcasts" feed={podcasts} results={results}>
      <Controls>
        <SearchBox value={query} onChange={setQuery} label="Search podcasts" />
      </Controls>
      <Await promise={podcasts} fallback={<Loading block />}>
        {({ data }) => <Table items={results(data)} columns={podcastColumns} id={(podcast) => podcast.uuid} />}
      </Await>
    </Collection>
  )
}

export function Episodes({ episodes }: { episodes: Promise<Feed<Episode[]>> }) {
  const [query, setQuery] = useState('')
  const [playedOnly, setPlayedOnly] = useState(true)
  const [limit, setLimit] = useState(episodePageSize)
  const results = (episodes: Episode[]) => search(episodes, episodeKeys, query)
    .filter((episode) => !playedOnly || episode.playedSeconds > 0)
  return (
    <Collection title="Recent episodes" feed={episodes} results={results}>
      <p className="-mt-3 mb-4 text-muted-foreground">Last {recentDays} days</p>
      <Controls>
        <SearchBox value={query} onChange={(value) => { setQuery(value); setLimit(episodePageSize) }} label="Search episodes" />
        <label className="flex min-h-11 items-center gap-1.5 text-sm font-semibold">
          <input type="checkbox" className="size-4.5 accent-primary" checked={playedOnly} onChange={(event) => { setPlayedOnly(event.target.checked); setLimit(episodePageSize) }} />
          Played only
        </label>
      </Controls>
      <Await promise={episodes} fallback={<Loading block />}>
        {({ data }) => {
          const found = results(data)
          const shown = Math.min(found.length, limit)
          return (
            <>
              <Table items={found} columns={episodeColumns} id={(episode) => episode.uuid} limit={limit} />
              {shown < found.length && (
                <div className="mt-4 flex items-center gap-4">
                  <Button onClick={() => setLimit(limit + episodePageStep)}>Show more</Button>
                  <span className="text-muted-foreground">{shown} of {found.length}</span>
                </div>
              )}
            </>
          )
        }}
      </Await>
    </Collection>
  )
}

// The author or podcast under a detail page's title.
const byline = 'mt-3 text-xl text-accent'

function Stat({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="rounded-md border bg-card px-4 py-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-lg font-bold">{children}</dd>
    </div>
  )
}

function Artwork({ src, kind }: { src: string; kind: 'book' | 'podcast' }) {
  const [failed, setFailed] = useState(false)
  return (
    <div
      className={classes(
        'grid w-16 shrink-0 place-items-center overflow-hidden rounded-md bg-artwork sm:w-24 md:w-28',
        kind === 'book' ? 'aspect-2/3' : 'aspect-square',
      )}
    >
      {src && !failed
        ? <img src={src} alt="" referrerPolicy="no-referrer" className="size-full object-contain" onError={() => setFailed(true)} />
        : <img src="/scrobble-cast.svg" alt="" className="w-[70%]" />}
    </div>
  )
}

export function BookDetail({ book }: { book: Promise<Book | undefined> }) {
  return (
    <article className="max-w-4xl">
      <Link className="mb-6 inline-block" to="/books">← Books</Link>
      <Found record={book}>{(book) => <BookInfo book={book} />}</Found>
    </article>
  )
}

function BookInfo({ book }: { book: Book }) {
  usePageTitle(book.title)
  return (
    <>
      <div className="flex items-start gap-4 sm:gap-8">
        <Artwork key={book.bookImageURL} src={book.bookImageURL} kind="book" />
        <div>
          <Heading>{book.title}</Heading>
          <p className={byline}>{book.authorName}</p>
          <p className="mt-2 mb-4 text-muted-foreground">{shelfName(book.userShelf)}{book.userLastReadAt && ` · Last read ${day(book.userLastReadAt)}`}</p>
          <a href={book.bookURL}>View on Goodreads <span aria-hidden="true">↗</span></a>
        </div>
      </div>
      {book.bookDescription && <p className="mt-7 max-w-[72ch] leading-relaxed whitespace-pre-line">{book.bookDescription}</p>}
    </>
  )
}

export function PodcastDetail({ podcast }: { podcast: Promise<Podcast | undefined> }) {
  return (
    <article className="max-w-4xl">
      <Link className="mb-6 inline-block" to="/podcasts">← Podcasts</Link>
      <Found record={podcast}>{(podcast) => <PodcastInfo podcast={podcast} />}</Found>
    </article>
  )
}

function PodcastInfo({ podcast }: { podcast: Podcast }) {
  usePageTitle(podcast.title)
  return (
    <>
      <div className="flex items-start gap-4 sm:gap-8">
        <Artwork key={podcast.thumbnail} src={podcast.thumbnail} kind="podcast" />
        <div>
          <Heading>{podcast.title}</Heading>
          {podcast.author && <p className={byline}>{podcast.author}</p>}
          {podcast.firstSeen && <p className="mt-2 mb-4 text-muted-foreground">In the catalog since {day(podcast.firstSeen)}</p>}
        </div>
      </div>
      {podcast.description && <p className="mt-7 max-w-[72ch] leading-relaxed whitespace-pre-line">{podcast.description}</p>}
    </>
  )
}

export function EpisodeDetail({ episode }: { episode: Promise<Episode | undefined> }) {
  return (
    <article className="max-w-4xl">
      <Link className="mb-6 inline-block" to="/episodes">← Episodes</Link>
      <Found record={episode}>{(episode) => <EpisodeInfo episode={episode} />}</Found>
    </article>
  )
}

function EpisodeInfo({ episode }: { episode: Episode }) {
  usePageTitle(episode.title)
  return (
    <>
      <Heading>{episode.title}</Heading>
      {episode.podcastId && episode.podcastTitle && (
        <p className={byline}><Link to="/podcasts/$uuid" params={{ uuid: episode.podcastId }}>{episode.podcastTitle}</Link></p>
      )}
      <dl className="mt-7 grid grid-cols-[repeat(auto-fit,minmax(9rem,1fr))] gap-3">
        <Stat label="Played">{playedPercent(episode)}%</Stat>
        <Stat label="Duration">{episode.duration ? `${Math.round(episode.duration / 60)} min` : '—'}</Stat>
        <Stat label="First played">{day(episode.firstPlayed)}</Stat>
        <Stat label="Last played">{day(episode.lastPlayed)}</Stat>
      </dl>
    </>
  )
}
