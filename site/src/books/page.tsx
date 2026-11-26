import { Await, Link } from '@tanstack/react-router'
import { bookPageSize } from '../config'
import type { Book } from '../data/books'
import type { Feed } from '../data/fetch'
import { useListQuery } from '../list/state'
import { Table } from '../list/table'
import type { Column } from '../list/table'
import { Loading } from '../pages'
import { Heading, classes, control } from '../ui'
import { booksList } from './list'

// The feed's covers are small (`._SY75_`); the same URL gives other heights.
export function coverUrl(book: Book, size: 'SY75' | 'SY300') {
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

// The books list: one query line over a table whose fields follow the query.
export function Books({ books }: { books: Promise<Feed<Book[]>> }) {
  const [text, setText] = useListQuery('books')
  const query = booksList.parse(text)
  const fields = booksList.shown(query)

  return (
    <>
      <header className="mb-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
        <Heading>Books</Heading>
        <p className="text-muted-foreground tabular-nums" aria-live="polite">
          <Await promise={books} fallback={<Loading />}>{({ data }) => count(booksList.run(data, query).length)}</Await>
        </p>
      </header>
      <label className="grid gap-1.5">
        <span className="sr-only">Query</span>
        <input
          type="search"
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          placeholder="shelf:on-deck pages:<300 sort:-avg   — or just words"
          className={classes(control, 'font-mono text-base')}
          value={text}
          onChange={(event) => setText(event.target.value)}
        />
      </label>
      {query.notUnderstood.length > 0 && (
        <p className="mt-2 text-sm text-muted-foreground">
          Not understood: <code className="text-foreground line-through">{query.notUnderstood.join(' ')}</code>
        </p>
      )}
      <p className="mt-3 mb-3 text-sm text-muted-foreground">
        Showing {fields.map(({ label }) => label).join(' · ')}
        {!query.show && <> <span className="opacity-70">(from the query; <code>show:</code> to change)</span></>}
      </p>
      <Await promise={books} fallback={<Loading block />}>
        {({ data }) => {
          const results = booksList.run(data, query)
          return (
            <>
              <Table
                items={results.slice(0, bookPageSize)}
                columns={[bookColumn, ...fields]}
                id={(book) => book.bookId}
                sorts={query.order}
                onSort={(key) => setText(booksList.format(booksList.sortBy(query, key)))}
              />
              {results.length > bookPageSize && (
                <p className="mt-4 text-muted-foreground tabular-nums">The first {bookPageSize} of {results.length.toLocaleString()}</p>
              )}
            </>
          )
        }}
      </Await>
    </>
  )
}

function count(n: number) {
  return `${n.toLocaleString()} ${n === 1 ? 'book' : 'books'}`
}
