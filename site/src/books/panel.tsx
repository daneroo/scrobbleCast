import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import type { Book } from '../data/books'
import { cellOf } from '../list/table'
import { Cover } from './card'
import { bookField } from './list'

// A book's panel under its table row: what can be checked without leaving
// the list, including what the query can't reach (the review, the ISBN and
// the timeline). Its composition is the layout prototype's.

// "—" for no value, or an empty one.
function orDash(node: ReactNode) {
  return node === undefined || node === null || node === '' ? '—' : node
}

// A fact from the registry: its label, and its cell (or plain value), so the
// panel says what the table says.
function fact(key: string): [label: string, show: (book: Book) => ReactNode] {
  const field = bookField(key)
  return [field.label, (book) => orDash(cellOf(field, book))]
}

const facts = [
  fact('shelf'),
  fact('rating'),
  fact('avg'),
  fact('pages'),
  // The full date, not the table's year.
  [bookField('published').label, (book) => orDash(book.bookPublished)],
  fact('added'),
  fact('first'),
  fact('read'),
  fact('reads'),
  ['ISBN', (book) => orDash(book.isbn)],
] satisfies [string, (book: Book) => ReactNode][]

// The cover beside the rest; on a phone, no cover.
export function BookPanel({ book }: { book: Book }) {
  return (
    <div className="grid gap-4 border-t bg-table-stripe p-4 sm:grid-cols-[8rem_1fr]">
      <Cover book={book} className="hidden w-32 sm:block" />
      {/* Long unbroken text wraps, so it can't widen the table. */}
      <div className="grid min-w-0 content-start gap-3 text-sm wrap-anywhere">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-5">
          {facts.map(([label, show]) => (
            <div key={label}>
              <dt className="text-xs text-muted-foreground">{label}</dt>
              <dd className="tabular-nums">{show(book)}</dd>
            </div>
          ))}
        </dl>
        {book.userReview && <blockquote className="border-l-2 border-primary pl-3 whitespace-pre-line italic">{book.userReview}</blockquote>}
        <p className="line-clamp-4 text-muted-foreground">{orDash(book.bookDescription)}</p>
        <p className="text-xs text-muted-foreground">
          {orDash(book.timeline.map(({ dateText, event }) => `${dateText || '—'} ${event}`).join(' → '))}
        </p>
        <Link to="/books/$bookId" params={{ bookId: book.bookId }} className="justify-self-start">Open book page <span aria-hidden="true">→</span></Link>
      </div>
    </div>
  )
}
