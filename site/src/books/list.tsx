import type { ReactNode } from 'react'
import { booksSearchThreshold } from '../config'
import { shelfName, shelfNames, type Book } from '../data/books'
import { defineList } from '../list/query'
import type { Field, Query } from '../list/query'
import { Progress, ShelfBadge, Stars } from './ui'

// The books list's query: its fields, search keys, default sort and the
// default-fields rule. Its keywords and that rule are the layout prototype's
// (branch `prototype/layout`).

// A books field: a query keyword, with its table cell and its short line
// under a card.
export interface BookField extends Field<Book> {
  cell?: (book: Book) => ReactNode
  short?: (book: Book) => ReactNode
}

// The book's own timeline rows: not another edition's ("… (Hardcover
// Edition)").
function ownTimeline(book: Book) {
  return book.timeline.filter(({ event }) => !/ Edition\)$/.test(event))
}

// The last percentage in its own timeline ("44.0%").
export function progress(book: Book): number | undefined {
  let found: number | undefined
  for (const { event } of ownTimeline(book)) {
    const match = /(\d+(?:\.\d+)?)%$/.exec(event)
    if (match) found = Number(match[1])
  }
  return found
}

function avg(book: Book) {
  return Number(book.averageRating) || undefined
}

// My rating less the average; none until I rate it. The average has two
// decimals, so rounding to two drops floating-point noise (4 − 3.2 is
// 0.7999…) and keeps the value exact either side of zero. Shown to one.
function gap(book: Book) {
  const average = avg(book)
  if (!book.userRating || !average) return undefined
  const difference = book.userRating - average
  return Math.sign(difference) * Math.round(100 * Math.abs(difference)) / 100
}

function signed(value: number | undefined) {
  return value === undefined ? '—' : (value > 0 ? '+' : '') + value.toFixed(1)
}

// The year of a publication date: "1995", "2023-11-05", "-0750" (BC).
function year(published: string) {
  return /^-?\d{4}/.exec(published)?.[0].replace(/^(-?)0+(?=\d)/, '$1')
}

const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

// A timeline date as ISO 8601, at the precision it gives: "2021" is 2021,
// "February, 1997" 1997-02, "May 2, 2021" 2021-05-02.
function timelineDate(text: string) {
  const match = /^(?:([A-Z][a-z]+)(?: (\d{1,2}))?, )?(\d{4})$/.exec(text)
  const month = match?.[1] && months.indexOf(match[1]) + 1
  if (!match || month === 0) return undefined
  const two = (n: number | string) => String(n).padStart(2, '0')
  return [match[3], ...(month ? [two(month)] : []), ...(match[2] ? [two(match[2])] : [])].join('-')
}

// A read date as precise as the timeline gives it: the feed pads a year to
// 1 January and a month to its 1st ("2021" is 2021-01-01T08:00Z), so the
// book's own "Finished Reading" row that pads to the same day says what was
// known; the most precise, when two do. Without one, the feed's day.
function readDate(book: Book, at: string) {
  const feedDay = at.slice(0, 10)
  let found: string | undefined
  for (const { dateText, event } of ownTimeline(book)) {
    const date = event === 'Finished Reading' ? timelineDate(dateText) : undefined
    const padded = date && `${date}-01-01`.slice(0, 10)
    if (date && padded === feedDay && date.length > (found?.length ?? 0)) found = date
  }
  return found ?? feedDay
}

// A date field, ISO 8601: sorted by the feed's date, and filtered and shown
// as `precise` gives it, its day unless a read date says otherwise.
function dateField(
  field: Pick<BookField, 'key' | 'label' | 'aliases' | 'note' | 'example'>,
  date: (book: Book) => string,
  short: string,
  precise = (book: Book) => date(book).slice(0, 10),
): BookField {
  return {
    ...field,
    kind: 'date',
    value: (book) => date(book) || undefined,
    filterValue: (book) => precise(book) || undefined,
    cell: (book) => precise(book) || '—',
    short: (book) => precise(book) ? `${short} ${precise(book)}` : null,
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
  dateField(
    { key: 'read', aliases: ['year'], label: 'Last read', note: 'as precise as the reading timeline gives it: a year, a month or a day', example: 'read:>=2024-06' },
    (book) => book.userLastReadAt,
    'read',
    (book) => readDate(book, book.userLastReadAt),
  ),
  dateField({ key: 'first', label: 'First read', note: 'as precise as the reading timeline gives it', example: 'first:<2010' }, (book) => book.userFirstReadAt, 'first', (book) => readDate(book, book.userFirstReadAt)),
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
    neverShared: true,
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

// A field by its key; a key that isn't one is a bug.
export function bookField(key: string) {
  const field = fields.find((each) => each.key === key)
  if (!field) throw new Error(`No books field: ${key}`)
  return field
}

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
