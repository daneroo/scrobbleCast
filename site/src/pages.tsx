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
    ? <p className="empty" role="status">Loading…</p>
    : <span className="loading" role="status" aria-label="Loading">…</span>
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
    <label className="search-field">
      <span>{label}</span>
      <input type="search" value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  )
}

function Collection({
  title, count, children,
}: { title: string; count: ReactNode; children: ReactNode }) {
  return (
    <>
      <header className="page-title">
        <h1>{title}</h1>
        <p aria-live="polite">{count}</p>
      </header>
      {children}
    </>
  )
}

function ResultCount({ count }: { count: number }) {
  return <>{count.toLocaleString()} {count === 1 ? 'result' : 'results'}</>
}

export function Home({ feeds }: {
  feeds: { books: Promise<Feed<Book[]>>; podcasts: Promise<Feed<Podcast[]>>; episodes: Promise<Feed<Episode[]>> }
}) {
  const sections = [
    {
      to: '/books', title: 'Books', label: 'read', style: 'books',
      count: <Await promise={feeds.books} fallback={<Loading />}>{({ data }) => data.filter((book) => book.userShelf === 'read').length.toLocaleString()}</Await>,
    },
    {
      to: '/podcasts', title: 'Podcasts', label: 'in the catalog', style: 'podcasts',
      count: <Await promise={feeds.podcasts} fallback={<Loading />}>{({ data }) => data.length.toLocaleString()}</Await>,
    },
    {
      to: '/episodes', title: 'Episodes', label: `played in the last ${recentDays} days`, style: 'episodes',
      count: <Await promise={feeds.episodes} fallback={<Loading />}>{({ data }) => data.filter((episode) => episode.playedSeconds > 0).length.toLocaleString()}</Await>,
    },
  ] as const

  return (
    <>
      <section className="hero">
        <div>
          <h1>Scrobble Cast</h1>
          <p>What my eyes and ears have been up to.</p>
        </div>
        <img src="/scrobble-cast.svg" alt="" width="180" height="180" />
      </section>
      <div className="collections">
        {sections.map(({ to, title, count, label, style }) => (
          <Link key={to} to={to} className={`collection-card ${style}`}>
            <span className="card-title">{title}<span aria-hidden="true">↗</span></span>
            <strong>{count}</strong>
            <span>{label}</span>
          </Link>
        ))}
      </div>
    </>
  )
}

export function Books({ books }: { books: Promise<Feed<Book[]>> }) {
  const [query, setQuery] = useState('')
  const [shelf, setShelf] = useState<string>()
  const results = (books: Book[]) => {
    const shown = shelf ?? defaultShelf(books)
    return search(books, bookKeys, query).filter((book) => !shown || book.userShelf === shown)
  }

  return (
    <Collection title="Books" count={<Await promise={books} fallback={<Loading />}>{({ data }) => <ResultCount count={results(data).length} />}</Await>}>
      <div className="controls">
        <SearchBox value={query} onChange={setQuery} label="Search books" />
        <label>
          <span>Shelf</span>
          <Await promise={books} fallback={<select disabled><option>All shelves</option></select>}>
            {({ data }) => (
              <select value={shelf ?? defaultShelf(data)} onChange={(event) => setShelf(event.target.value)}>
                <option value="">All shelves</option>
                {[...new Set(data.map((book) => book.userShelf))].map((name) => <option key={name} value={name}>{shelfName(name)}</option>)}
              </select>
            )}
          </Await>
        </label>
      </div>
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
    <Collection title="Podcasts" count={<Await promise={podcasts} fallback={<Loading />}>{({ data }) => <ResultCount count={results(data).length} />}</Await>}>
      <div className="controls">
        <SearchBox value={query} onChange={setQuery} label="Search podcasts" />
      </div>
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
    <Collection title="Recent episodes" count={<Await promise={episodes} fallback={<Loading />}>{({ data }) => <ResultCount count={results(data).length} />}</Await>}>
      <p className="section-note">Last {recentDays} days</p>
      <div className="controls">
        <SearchBox value={query} onChange={(value) => { setQuery(value); setLimit(episodePageSize) }} label="Search episodes" />
        <label className="check">
          <input type="checkbox" checked={playedOnly} onChange={(event) => { setPlayedOnly(event.target.checked); setLimit(episodePageSize) }} />
          Played only
        </label>
      </div>
      <Await promise={episodes} fallback={<Loading block />}>
        {({ data }) => {
          const found = results(data)
          const shown = Math.min(found.length, limit)
          return (
            <>
              <Table items={found} columns={episodeColumns} id={(episode) => episode.uuid} limit={limit} />
              {shown < found.length && (
                <div className="more">
                  <button className="button" type="button" onClick={() => setLimit(limit + episodePageStep)}>Show more</button>
                  <span>{shown} of {found.length}</span>
                </div>
              )}
            </>
          )
        }}
      </Await>
    </Collection>
  )
}

function Artwork({ src, kind }: { src: string; kind: 'book' | 'podcast' }) {
  const [failed, setFailed] = useState(false)
  return (
    <div className={`artwork ${kind}`}>
      {src && !failed
        ? <img src={src} alt="" referrerPolicy="no-referrer" onError={() => setFailed(true)} />
        : <img className="artwork-placeholder" src="/scrobble-cast-icon.svg" alt="" />}
    </div>
  )
}

export function BookDetail({ book }: { book: Promise<Book | undefined> }) {
  return (
    <article className="detail">
      <Link className="back" to="/books">← Books</Link>
      <Found record={book}>{(book) => <BookInfo book={book} />}</Found>
    </article>
  )
}

function BookInfo({ book }: { book: Book }) {
  usePageTitle(book.title)
  return (
    <>
      <div className="detail-heading">
        <Artwork key={book.bookImageURL} src={book.bookImageURL} kind="book" />
        <div>
          <h1>{book.title}</h1>
          <p className="byline">{book.authorName}</p>
          <p className="metadata">{shelfName(book.userShelf)}{book.userLastReadAt && ` · Last read ${day(book.userLastReadAt)}`}</p>
          <a href={book.bookURL}>View on Goodreads <span aria-hidden="true">↗</span></a>
        </div>
      </div>
      {book.bookDescription && <p className="description">{book.bookDescription}</p>}
    </>
  )
}

export function PodcastDetail({ podcast }: { podcast: Promise<Podcast | undefined> }) {
  return (
    <article className="detail">
      <Link className="back" to="/podcasts">← Podcasts</Link>
      <Found record={podcast}>{(podcast) => <PodcastInfo podcast={podcast} />}</Found>
    </article>
  )
}

function PodcastInfo({ podcast }: { podcast: Podcast }) {
  usePageTitle(podcast.title)
  return (
    <>
      <div className="detail-heading">
        <Artwork key={podcast.thumbnail} src={podcast.thumbnail} kind="podcast" />
        <div>
          <h1>{podcast.title}</h1>
          {podcast.author && <p className="byline">{podcast.author}</p>}
          {podcast.firstSeen && <p className="metadata">In the catalog since {day(podcast.firstSeen)}</p>}
        </div>
      </div>
      {podcast.description && <p className="description">{podcast.description}</p>}
    </>
  )
}

export function EpisodeDetail({ episode }: { episode: Promise<Episode | undefined> }) {
  return (
    <article className="detail">
      <Link className="back" to="/episodes">← Episodes</Link>
      <Found record={episode}>{(episode) => <EpisodeInfo episode={episode} />}</Found>
    </article>
  )
}

function EpisodeInfo({ episode }: { episode: Episode }) {
  usePageTitle(episode.title)
  return (
    <>
      <h1>{episode.title}</h1>
      {episode.podcastId && episode.podcastTitle && (
        <p className="byline"><Link to="/podcasts/$uuid" params={{ uuid: episode.podcastId }}>{episode.podcastTitle}</Link></p>
      )}
      <dl className="episode-stats">
        <div><dt>Played</dt><dd>{playedPercent(episode)}%</dd></div>
        <div><dt>Duration</dt><dd>{episode.duration ? `${Math.round(episode.duration / 60)} min` : '—'}</dd></div>
        <div><dt>First played</dt><dd>{day(episode.firstPlayed)}</dd></div>
        <div><dt>Last played</dt><dd>{day(episode.lastPlayed)}</dd></div>
      </dl>
    </>
  )
}
