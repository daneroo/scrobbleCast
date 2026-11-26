import { Await, Link } from '@tanstack/react-router'
import { useEffect, useMemo, useRef } from 'react'
import { bookPageSize, bookPageStep, journalLaneLength } from '../config'
import type { Book } from '../data/books'
import type { Feed } from '../data/fetch'
import { Journal } from '../list/journal'
import type { Query } from '../list/query'
import { QueryLine } from '../list/query-line'
import { Scroll, useTopOnRestart } from '../list/scroll'
import { useListQuery, useListView } from '../list/state'
import { Table } from '../list/table'
import type { Column } from '../list/table'
import type { View } from '../list/view'
import { ViewSwitch } from '../list/view-switch'
import { Heading, Loading, Panel } from '../ui'
import { BookCard, BookCards, Cover } from './card'
import { booksList } from './list'
import type { BookField } from './list'
import { BookPanel } from './panel'
import { bookPresets } from './presets'

// The table's lead column: the book itself, not a query field, so it has its
// own key and no sort.
const bookColumn: Column<Book> = {
  key: 'book',
  label: 'Book',
  sortable: false,
  value: (book) => book.title,
  cell: (book) => (
    <span className="flex items-start gap-3">
      <Cover book={book} size="SY75" className="w-9 shrink-0" />
      <span className="grid">
        <Link to="/books/$bookId" params={{ bookId: book.bookId }} className="font-semibold">{book.title}</Link>
        <span className="text-sm text-muted-foreground">{book.authorName}</span>
      </span>
    </span>
  ),
}

// A row click opens the book's panel under it; `label` names its disclosure
// button.
const expand = {
  panel: (book: Book) => <BookPanel book={book} />,
  label: (book: Book) => `Details for ${book.title}`,
}

// A journal lane's card: small, with at most two short lines and, as in the
// prototype's lanes, never the shelf's.
function laneCard(book: Book, fields: readonly BookField[]) {
  return <BookCard book={book} size="small" fields={fields.filter(({ key }) => key !== 'shelf')} />
}

// The books list: one query line with the presets, then, once the feed has
// loaded, the journal for an empty query or the query's results.
//
// Every new query text (typed, a preset, "See all", "← Journal", a header
// click) goes back to the top if the list's start has scrolled off screen.
// "See all" and "← Journal" go with the button pressed, so focus moves to the
// input, after that scroll.
export function Books({ books }: { books: Promise<Feed<Book[]>> }) {
  const [text, setText] = useListQuery('books')
  const [view, setView, narrow] = useListView('books')
  const query = useMemo(() => booksList.parse(text), [text])
  const start = useTopOnRestart<HTMLDivElement>(text)
  const input = useRef<HTMLInputElement>(null)
  const focusInput = useRef(false)
  useEffect(() => {
    if (!focusInput.current) return
    focusInput.current = false
    input.current?.focus()
  }, [text])

  function open(next: string) {
    focusInput.current = true
    setText(next)
  }

  return (
    <>
      <Heading className="mb-4">Books</Heading>
      <QueryLine
        text={text}
        onChange={setText}
        onJournal={() => open('')}
        help={booksList.help()}
        notUnderstood={query.notUnderstood}
        presets={bookPresets}
        inputRef={input}
        placeholder="shelf:on-deck pages:<300 sort:-avg   — or just words"
      />
      <div ref={start}>
        <Await promise={books} fallback={<Loading block />}>
          {({ data }) => !query.tokens.length ? (
            <Journal
              list={booksList}
              presets={bookPresets}
              items={data}
              laneLength={journalLaneLength}
              id={(book) => book.bookId}
              card={laneCard}
              onOpen={open}
            />
          ) : (
            <Results
              books={data}
              query={query}
              view={view}
              narrow={narrow}
              onView={setView}
              onSort={(key) => setText(booksList.format(booksList.sortBy(query, key)))}
            />
          )}
        </Await>
      </div>
    </>
  )
}

// A query's results from one copy of the feed: the count, the fields shown,
// the view switch, and the results in that view, drawn as the reader scrolls.
function Results({ books, query, view, narrow, onView, onSort }: {
  books: Book[]
  query: Query
  view: View
  narrow: boolean
  onView: (view: View) => void
  onSort: (key: string) => void
}) {
  const results = useMemo(() => booksList.run(books, query), [books, query])
  const fields = useMemo(() => booksList.shown(query), [query])
  const columns = useMemo(() => [bookColumn, ...fields], [fields])

  return (
    <>
      <p className="text-muted-foreground tabular-nums" aria-live="polite">{count(results.length)}</p>
      <div className="mt-1 mb-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Showing {fields.map(({ label }) => label).join(' · ')}
          {' '}<span className="opacity-70">(from the query; <code>show:</code> to change)</span>
        </p>
        <ViewSwitch view={view} narrow={narrow} onChange={onView} />
      </div>
      {!results.length ? <Panel role="status">No matches.</Panel> : (
        <Scroll total={results.length} first={bookPageSize} step={bookPageStep} restart={query}>
          {(shown) => view === 'table'
            ? <Table items={results.slice(0, shown)} columns={columns} id={(book) => book.bookId} sorts={query.order} onSort={onSort} expand={expand} />
            : <BookCards books={results.slice(0, shown)} size={view} fields={fields} />}
        </Scroll>
      )}
    </>
  )
}

function count(n: number) {
  return `${n.toLocaleString()} ${n === 1 ? 'book' : 'books'}`
}
