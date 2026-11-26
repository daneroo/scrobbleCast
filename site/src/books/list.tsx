import type { ReactNode } from 'react'
import { shelfName, shelfNames, type Book } from '../data/books'
import { day } from '../format'
import { defineList } from '../list/query'
import type { Field, Query } from '../list/query'

// The books list's query: its fields, search keys, default sort and the
// default-fields rule. Its keywords and that rule are the layout prototype's
// (branch `prototype/layout`).

// A books field: a query keyword, with its table cell and its short line
// under a card.
export interface BookField extends Field<Book> {
  cell?: (book: Book) => ReactNode
  short?: (book: Book) => ReactNode
}

// The last percentage in the timeline ("44.0%"), ignoring another edition's
// rows ("… (Hardcover Edition)").
export function progress(book: Book): number | undefined {
  let found: number | undefined
  for (const { event } of book.timeline) {
    if (/ Edition\)$/.test(event)) continue
    const match = /(\d+(?:\.\d+)?)%$/.exec(event)
    if (match) found = Number(match[1])
  }
  return found
}

function avg(book: Book) {
  return Number(book.averageRating) || undefined
}

// My rating less the average, to one decimal; none until I rate it.
function gap(book: Book) {
  const average = avg(book)
  return book.userRating && average ? Math.round(10 * (book.userRating - average)) / 10 : undefined
}

function signed(value: number | undefined) {
  return value === undefined ? '—' : (value > 0 ? '+' : '') + value.toFixed(1)
}

// The year of a publication date: "1995", "2023-11-05", "-0750" (BC).
function year(published: string) {
  return /^-?\d{4}/.exec(published)?.[0].replace(/^(-?)0+(?=\d)/, '$1')
}

function Stars({ value }: { value: number }) {
  if (!value) return <span className="text-muted-foreground">—</span>
  const stars = Math.round(value)
  return (
    <span className="whitespace-nowrap tracking-tight" role="img" aria-label={`${value} of 5`} title={`${value} of 5`}>
      <span className="text-accent">{'★'.repeat(stars)}</span>
      <span className="text-muted-foreground opacity-50">{'★'.repeat(5 - stars)}</span>
    </span>
  )
}

export function ShelfBadge({ shelf }: { shelf: string }) {
  return <span className="inline-block rounded-full border px-2 py-0.5 text-xs whitespace-nowrap text-muted-foreground">{shelfName(shelf)}</span>
}

export function Progress({ value }: { value: number | undefined }) {
  if (value === undefined) return <span className="text-muted-foreground">—</span>
  return (
    <span className="inline-flex items-center gap-2">
      <span className="h-1.5 w-16 overflow-hidden rounded-full bg-table-stripe ring-1 ring-border">
        <span className="block h-full bg-primary" style={{ width: `${Math.min(value, 100)}%` }} />
      </span>
      <span className="tabular-nums">{Math.round(value)}%</span>
    </span>
  )
}

// A date field. Until dates get their own kind, they filter and sort as text
// (ISO 8601 sorts as text).
function dateField(key: string, label: string, date: (book: Book) => string, short: string): BookField {
  return {
    key,
    label,
    kind: 'text',
    value: (book) => date(book) || undefined,
    cell: (book) => day(date(book)),
    short: (book) => date(book) ? `${short} ${day(date(book))}` : null,
  }
}

const fields: BookField[] = [
  {
    key: 'rating',
    label: 'Rating',
    kind: 'number',
    value: (book) => book.userRating || undefined,
    // Unrated is 0: `rating:0`.
    filterValue: (book) => book.userRating,
    cell: (book) => <Stars value={book.userRating} />,
    short: (book) => book.userRating ? <Stars value={book.userRating} /> : null,
  },
  {
    key: 'avg',
    label: 'Avg',
    kind: 'number',
    value: avg,
    cell: (book) => book.averageRating,
    short: (book) => `avg ${book.averageRating}`,
  },
  {
    key: 'gap',
    label: 'Gap',
    kind: 'number',
    value: gap,
    // Its size: `gap:>=0.8` either way.
    filterValue: (book) => {
      const value = gap(book)
      return value === undefined ? undefined : Math.abs(value)
    },
    alsoShow: ['rating', 'avg'],
    cell: (book) => signed(gap(book)),
    short: (book) => gap(book) === undefined ? null : `${signed(gap(book))} vs avg`,
  },
  {
    key: 'pages',
    label: 'Pages',
    kind: 'number',
    value: (book) => Number(book.numPages) || undefined,
    short: (book) => Number(book.numPages) ? `${book.numPages} p` : null,
  },
  {
    key: 'reads',
    label: 'Reads',
    kind: 'number',
    value: (book) => book.userReadCount || undefined,
    // Unread is 0: `reads:0`.
    filterValue: (book) => book.userReadCount,
    short: (book) => book.userReadCount > 1 ? `read ${book.userReadCount}×` : null,
  },
  {
    key: 'shelf',
    label: 'Shelf',
    kind: 'choice',
    choices: Object.keys(shelfNames),
    // Sorted and shown by its name, filtered by its key (`on-deck`).
    value: (book) => shelfName(book.userShelf),
    filterValue: (book) => book.userShelf,
    cell: (book) => <ShelfBadge shelf={book.userShelf} />,
    short: (book) => shelfName(book.userShelf),
  },
  {
    key: 'progress',
    label: 'Progress',
    kind: 'number',
    value: progress,
    cell: (book) => <Progress value={progress(book)} />,
    short: (book) => progress(book) === undefined ? null : <Progress value={progress(book)} />,
  },
  { key: 'title', label: 'Title', kind: 'text', value: (book) => book.title },
  { key: 'author', label: 'Author', kind: 'text', value: (book) => book.authorName, short: (book) => book.authorName },
  dateField('read', 'Last read', (book) => book.userLastReadAt, 'read'),
  dateField('first', 'First read', (book) => book.userFirstReadAt, 'first'),
  {
    key: 'published',
    label: 'Published',
    kind: 'text',
    value: (book) => book.bookPublished || undefined,
    cell: (book) => year(book.bookPublished) ?? '—',
    short: (book) => year(book.bookPublished) ? `pub. ${year(book.bookPublished)}` : null,
  },
  dateField('added', 'Added', (book) => book.userAddedAt, 'added'),
  dateField('updated', 'Updated', (book) => book.userUpdatedAt, 'active'),
]

// The shelves the query names: those every shelf filter allows, or none
// without one.
function namedShelves(query: Query) {
  let shelves: string[] | undefined
  for (const filter of query.filters) {
    if (filter.kind !== 'choice' || filter.key !== 'shelf') continue
    shelves = shelves ? shelves.filter((shelf) => filter.choices.includes(shelf)) : filter.choices
  }
  return shelves ?? []
}

export const booksList = defineList<Book, BookField>({
  fields,
  searchKeys: ['title', 'authorName', 'bookDescription'],
  defaultSort: [{ key: 'updated', descending: true }],
  // The table's lead column: cover, title and author.
  lead: ['title', 'author'],
  // The shelf, unless the query names one; progress when it names
  // currently-reading.
  pinned: (query) => {
    const shelves = namedShelves(query)
    return [
      ...(shelves.length === 1 ? [] : ['shelf']),
      ...(shelves.includes('currently-reading') ? ['progress'] : []),
    ]
  },
  fill: (query) => {
    const shelves = namedShelves(query)
    if (shelves.length === 1 && shelves[0] === 'currently-reading') return ['pages', 'avg', 'updated']
    if (shelves.length && shelves.every((shelf) => shelf === 'to-read' || shelf === 'on-deck')) return ['avg', 'pages', 'published', 'added']
    return ['rating', 'avg', 'pages', 'read']
  },
  fillTo: 4,
  most: 5,
})
