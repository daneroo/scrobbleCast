import { Await, Link } from '@tanstack/react-router'
import { useMemo } from 'react'
import { bookPageSize } from '../config'
import type { Book } from '../data/books'
import type { Feed } from '../data/fetch'
import type { Query } from '../list/query'
import { QueryLine } from '../list/query-line'
import { useListQuery } from '../list/state'
import { Table } from '../list/table'
import type { Column } from '../list/table'
import { Heading, Loading } from '../ui'
import { booksList } from './list'

// The feed's covers are small (`._SY75_`); the same URL gives other heights.
function coverUrl(book: Book, size: 'SY75' | 'SY300') {
  return book.bookImageURL.replace(/\._S[XY]\d+_\./, `._${size}_.`)
}

// The table's lead column: the book itself, not a query field, so it has its
// own key and no sort.
const bookColumn: Column<Book> = {
  key: 'book',
  label: 'Book',
  sortable: false,
  value: (book) => book.title,
  cell: (book) => (
    <span className="flex items-start gap-3">
      <img src={coverUrl(book, 'SY75')} alt="" loading="lazy" referrerPolicy="no-referrer" className="aspect-2/3 w-9 shrink-0 rounded-sm bg-artwork object-cover shadow-sm" />
      <span className="grid">
        <Link to="/books/$bookId" params={{ bookId: book.bookId }} className="font-semibold">{book.title}</Link>
        <span className="text-sm text-muted-foreground">{book.authorName}</span>
      </span>
    </span>
  ),
}

// The books list: one query line, then the results of the feed once it has
// loaded.
export function Books({ books }: { books: Promise<Feed<Book[]>> }) {
  const [text, setText] = useListQuery('books')
  const query = useMemo(() => booksList.parse(text), [text])

  return (
    <>
      <Heading className="mb-4">Books</Heading>
      <QueryLine
        text={text}
        onChange={setText}
        help={booksList.help()}
        notUnderstood={query.notUnderstood}
        placeholder="shelf:on-deck pages:<300 sort:-avg   — or just words"
      />
      <Await promise={books} fallback={<Loading block />}>
        {({ data }) => (
          <Results books={data} query={query} onSort={(key) => setText(booksList.format(booksList.sortBy(query, key)))} />
        )}
      </Await>
    </>
  )
}

// A query's results from one copy of the feed: the count, the fields shown,
// and the table.
function Results({ books, query, onSort }: { books: Book[]; query: Query; onSort: (key: string) => void }) {
  const results = useMemo(() => booksList.run(books, query), [books, query])
  const fields = useMemo(() => booksList.shown(query), [query])
  const columns = useMemo(() => [bookColumn, ...fields], [fields])

  return (
    <>
      <p className="mt-3 text-muted-foreground tabular-nums" aria-live="polite">{count(results.length)}</p>
      <p className="mt-1 mb-3 text-sm text-muted-foreground">
        Showing {fields.map(({ label }) => label).join(' · ')}
        {!query.show && <> <span className="opacity-70">(from the query; <code>show:</code> to change)</span></>}
      </p>
      <Table items={results.slice(0, bookPageSize)} columns={columns} id={(book) => book.bookId} sorts={query.order} onSort={onSort} />
      {results.length > bookPageSize && (
        <p className="mt-4 text-muted-foreground tabular-nums">The first {bookPageSize} of {results.length.toLocaleString()}</p>
      )}
    </>
  )
}

function count(n: number) {
  return `${n.toLocaleString()} ${n === 1 ? 'book' : 'books'}`
}
