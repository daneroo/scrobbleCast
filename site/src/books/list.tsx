import type { ReactNode } from 'react'
import { booksSearchThreshold } from '../config'
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
function progress(book: Book): number | undefined {
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

function ShelfBadge({ shelf }: { shelf: string }) {
  return <span className="inline-block rounded-full border px-2 py-0.5 text-xs whitespace-nowrap text-muted-foreground">{shelfName(shelf)}</span>
}

function Progress({ value }: { value: number | undefined }) {
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

// A date field, ISO 8601, shown as its day.
function dateField(field: Pick<BookField, 'key' | 'label' | 'aliases' | 'note' | 'example'>, date: (book: Book) => string, short: string): BookField {
  return {
    ...field,
    kind: 'date',
    value: (book) => date(book) || undefined,
    cell: (book) => day(date(book)),
    short: (book) => date(book) ? `${short} ${day(date(book))}` : null,
  }
}

// In the order the help lists them.
const fields: BookField[] = [
  {
    key: 'rating',
    label: 'Rating',
    kind: 'number',
    value: (book) => book.userRating || undefined,
    // Unrated is 0: `rating:0`.
    filterValue: (book) => book.userRating,
    note: 'my stars; unrated is 0, so rating:0 finds books never rated',
    example: 'rating:>=4',
    cell: (book) => <Stars value={book.userRating} />,
    short: (book) => book.userRating ? <Stars value={book.userRating} /> : null,
  },
  dateField({ key: 'read', aliases: ['year'], label: 'Last read', example: 'read:>=2024-06' }, (book) => book.userLastReadAt, 'read'),
  dateField({ key: 'first', label: 'First read', example: 'first:<2010' }, (book) => book.userFirstReadAt, 'first'),
  {
    key: 'avg',
    label: 'Avg',
    kind: 'number',
    value: avg,
    note: 'the Goodreads average',
    example: 'avg:>=4.3',
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
    note: 'my rating less the average, shown signed; it filters on its size, so gap:>=0.8 finds disagreements either way',
    example: 'gap:>=0.8',
    cell: (book) => signed(gap(book)),
    short: (book) => gap(book) === undefined ? null : `${signed(gap(book))} vs avg`,
  },
  {
    key: 'pages',
    label: 'Pages',
    kind: 'number',
    value: (book) => Number(book.numPages) || undefined,
    example: 'pages:<300',
    short: (book) => Number(book.numPages) ? `${book.numPages} p` : null,
  },
  {
    key: 'published',
    label: 'Published',
    kind: 'date',
    value: (book) => book.bookPublished || undefined,
    note: 'shown as its year',
    example: 'published:<1950',
    cell: (book) => year(book.bookPublished) ?? '—',
    short: (book) => year(book.bookPublished) ? `pub. ${year(book.bookPublished)}` : null,
  },
  dateField({ key: 'added', label: 'Added', note: 'to my shelves', example: 'added:<2020' }, (book) => book.userAddedAt, 'added'),
  dateField({ key: 'updated', label: 'Updated', note: 'my latest activity on the book', example: 'updated:>=2025-06' }, (book) => book.userUpdatedAt, 'active'),
  {
    key: 'reads',
    label: 'Reads',
    kind: 'number',
    value: (book) => book.userReadCount || undefined,
    // Unread is 0: `reads:0`.
    filterValue: (book) => book.userReadCount,
    note: 'times read; unread is 0',
    example: 'reads:>=2',
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
    example: 'shelf:on-deck,to-read',
    cell: (book) => <ShelfBadge shelf={book.userShelf} />,
    short: (book) => shelfName(book.userShelf),
  },
  {
    key: 'progress',
    label: 'Progress',
    kind: 'number',
    value: progress,
    note: 'percent, the latest in the reading timeline',
    example: 'progress:<50',
    cell: (book) => <Progress value={progress(book)} />,
    short: (book) => progress(book) === undefined ? null : <Progress value={progress(book)} />,
  },
  { key: 'title', label: 'Title', kind: 'text', value: (book) => book.title, example: 'title:dune' },
  { key: 'author', label: 'Author', kind: 'text', value: (book) => book.authorName, example: 'author:banks', short: (book) => book.authorName },
  {
    key: 'tag',
    label: 'Tag',
    kind: 'tags',
    value: (book) => book.userTags.join(', ') || undefined,
    filterValue: (book) => book.userTags,
    note: 'my Goodreads tags',
    example: 'tag:long-term',
  },
]

// The shelves the query names: those every shelf filter allows, or none
// without one.
function namedShelves(query: Query) {
  let shelves: readonly string[] | undefined
  for (const filter of query.filters) {
    if (filter.kind !== 'choice' || filter.key !== 'shelf') continue
    shelves = shelves ? shelves.filter((shelf) => filter.choices.includes(shelf)) : filter.choices
  }
  return shelves ?? []
}

export const booksList = defineList<Book, BookField>({
  fields,
  searchKeys: ['title', 'authorName', 'bookDescription'],
  searchThreshold: booksSearchThreshold,
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
  help: { words: 'title, author and description', sort: 'sort:-avg,-added', show: 'show:avg,pages,read' },
})
