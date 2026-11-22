import { Link } from '@tanstack/react-router'
import { useState } from 'react'
import type { ReactNode } from 'react'
import { episodePageSize, episodePageStep, recentDays } from './config'
import type { Book, Episode, Podcast } from './data'
import { day, playedPercent } from './format'
import { useSearch } from './search'
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
}: { title: string; count: number; children: ReactNode }) {
  return (
    <>
      <header className="page-title">
        <h1>{title}</h1>
        <p aria-live="polite">{count.toLocaleString()} {count === 1 ? 'result' : 'results'}</p>
      </header>
      {children}
    </>
  )
}

export function Home({ counts }: { counts: { books: number; podcasts: number; episodes: number } }) {
  const sections = [
    { to: '/books', title: 'Books', count: counts.books, label: 'read', style: 'books' },
    { to: '/podcasts', title: 'Podcasts', count: counts.podcasts, label: 'in the catalog', style: 'podcasts' },
    { to: '/episodes', title: 'Episodes', count: counts.episodes, label: `played in the last ${recentDays} days`, style: 'episodes' },
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
            <strong>{count.toLocaleString()}</strong>
            <span>{label}</span>
          </Link>
        ))}
      </div>
    </>
  )
}

export function Books({ books }: { books: Book[] }) {
  const [query, setQuery] = useState('')
  const [shelf, setShelf] = useState(books.some((book) => book.userShelf === 'currently-reading') ? 'currently-reading' : '')
  const shelves = [...new Set(books.map((book) => book.userShelf))]
  const results = useSearch(books, bookKeys, query.trim())
    .filter((book) => !shelf || book.userShelf === shelf)

  return (
    <Collection title="Books" count={results.length}>
      <div className="controls">
        <SearchBox value={query} onChange={setQuery} label="Search books" />
        <label>
          <span>Shelf</span>
          <select value={shelf} onChange={(event) => setShelf(event.target.value)}>
            <option value="">All shelves</option>
            {shelves.map((name) => <option key={name} value={name}>{shelfName(name)}</option>)}
          </select>
        </label>
      </div>
      <Table items={results} columns={bookColumns} id={(book) => book.bookId} />
    </Collection>
  )
}

export function Podcasts({ podcasts }: { podcasts: Podcast[] }) {
  const [query, setQuery] = useState('')
  const results = useSearch(podcasts, podcastKeys, query)
  return (
    <Collection title="Podcasts" count={results.length}>
      <div className="controls">
        <SearchBox value={query} onChange={setQuery} label="Search podcasts" />
      </div>
      <Table items={results} columns={podcastColumns} id={(podcast) => podcast.uuid} />
    </Collection>
  )
}

export function Episodes({ episodes }: { episodes: Episode[] }) {
  const [query, setQuery] = useState('')
  const [playedOnly, setPlayedOnly] = useState(true)
  const [limit, setLimit] = useState(episodePageSize)
  const results = useSearch(episodes, episodeKeys, query)
    .filter((episode) => !playedOnly || episode.playedSeconds > 0)
  const shown = Math.min(results.length, limit)
  return (
    <Collection title="Recent episodes" count={results.length}>
      <p className="section-note">Last {recentDays} days</p>
      <div className="controls">
        <SearchBox value={query} onChange={(value) => { setQuery(value); setLimit(episodePageSize) }} label="Search episodes" />
        <label className="check">
          <input type="checkbox" checked={playedOnly} onChange={(event) => { setPlayedOnly(event.target.checked); setLimit(episodePageSize) }} />
          Played only
        </label>
      </div>
      <Table items={results} columns={episodeColumns} id={(episode) => episode.uuid} limit={limit} />
      {shown < results.length && (
        <div className="more">
          <button className="button" type="button" onClick={() => setLimit(limit + episodePageStep)}>Show more</button>
          <span>{shown} of {results.length}</span>
        </div>
      )}
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

export function BookDetail({ book }: { book: Book }) {
  return (
    <article className="detail">
      <Link className="back" to="/books">← Books</Link>
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
    </article>
  )
}

export function PodcastDetail({ podcast }: { podcast: Podcast }) {
  return (
    <article className="detail">
      <Link className="back" to="/podcasts">← Podcasts</Link>
      <div className="detail-heading">
        <Artwork key={podcast.thumbnail} src={podcast.thumbnail} kind="podcast" />
        <div>
          <h1>{podcast.title}</h1>
          {podcast.author && <p className="byline">{podcast.author}</p>}
          {podcast.firstSeen && <p className="metadata">In the catalog since {day(podcast.firstSeen)}</p>}
        </div>
      </div>
      {podcast.description && <p className="description">{podcast.description}</p>}
    </article>
  )
}

export function EpisodeDetail({ episode }: { episode: Episode }) {
  return (
    <article className="detail">
      <Link className="back" to="/episodes">← Episodes</Link>
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
    </article>
  )
}
