import { expect, test } from 'vite-plus/test'
import type { Book } from '../data/books'
import { booksList } from './list'

let lastId = 0

// A book with plain defaults: on to-read, unrated, nothing read.
function book(fields: Partial<Book> = {}): Book {
  const id = String(++lastId)
  return {
    id,
    title: `Book ${id}`,
    bookId: id,
    bookURL: `https://www.goodreads.com/book/show/${id}`,
    bookImageURL: `https://i.gr-assets.com/images/${id}._SY75_.jpg`,
    isbn: '',
    userRating: 0,
    userAddedAt: '2026-01-01T08:00:00.000Z',
    userShelf: 'to-read',
    userTags: [],
    averageRating: '4.0',
    bookPublished: '2020',
    numPages: '300',
    workId: id,
    userUpdatedAt: '2026-01-01T08:00:00.000Z',
    userReadCount: 0,
    userFirstReadAt: '',
    userLastReadAt: '',
    userReview: '',
    bookDescription: '',
    authorName: 'An Author',
    timeline: [],
    ...fields,
  }
}

function shown(text: string) {
  return booksList.shown(booksList.parse(text)).map(({ key }) => key)
}

function titles(books: Book[], text: string) {
  return booksList.run(books, booksList.parse(text)).map(({ title }) => title)
}

test('with no shelf named: the shelf, then rating, avg, pages', () => {
  expect(shown('')).toEqual(['shelf', 'rating', 'avg', 'pages'])
  expect(shown('dune')).toEqual(['shelf', 'rating', 'avg', 'pages'])
})

test('currently-reading alone: progress, then pages, avg, updated', () => {
  expect(shown('shelf:currently-reading')).toEqual(['progress', 'pages', 'avg', 'updated'])
})

test('only to-read or on-deck: avg, pages, published, added', () => {
  expect(shown('shelf:on-deck')).toEqual(['avg', 'pages', 'published', 'added'])
  expect(shown('shelf:to-read')).toEqual(['avg', 'pages', 'published', 'added'])
  expect(shown('shelf:to-read,on-deck')).toEqual(['shelf', 'avg', 'pages', 'published'])
})

test('any other shelves: rating, avg, pages, read', () => {
  expect(shown('shelf:read')).toEqual(['rating', 'avg', 'pages', 'read'])
  expect(shown('shelf:did-not-finish,to-read')).toEqual(['shelf', 'rating', 'avg', 'pages'])
})

test('shelves that include currently-reading pin progress', () => {
  expect(shown('shelf:currently-reading,read')).toEqual(['shelf', 'progress', 'rating', 'avg'])
})

test('the prototype quick next read shows pages, avg, published, added', () => {
  expect(shown('shelf:on-deck pages:<300 sort:-avg,pages')).toEqual(['pages', 'avg', 'published', 'added'])
})

test('shelf:deck is on-deck, and shelf:read is not currently-reading', () => {
  const books = [
    book({ title: 'Deck', userShelf: 'on-deck' }),
    book({ title: 'Reading', userShelf: 'currently-reading' }),
    book({ title: 'Read', userShelf: 'read' }),
  ]
  expect(titles(books, 'shelf:deck')).toEqual(['Deck'])
  expect(titles(books, 'shelf:read')).toEqual(['Read'])
  expect(titles(books, 'shelf:reading')).toEqual(['Reading'])
  expect(booksList.parse('shelf:shelved').notUnderstood).toEqual(['shelf:shelved'])
})

test('progress is the last percentage in the timeline, not another edition\'s', () => {
  const books = [
    book({
      title: 'Halfway',
      timeline: [
        { dateText: 'November 1, 2026', event: 'Started Reading' },
        { dateText: 'November 1, 2026', event: '14.0%' },
        { dateText: 'November 2, 2026', event: '50.0%' },
        { dateText: 'November 3, 2026', event: '90.0% (Hardcover Edition)' },
      ],
    }),
    book({ title: 'Not started', timeline: [{ dateText: 'November 1, 2026', event: 'Shelved' }] }),
  ]
  expect(titles(books, 'progress:50')).toEqual(['Halfway'])
  expect(titles(books, 'progress:<100')).toEqual(['Halfway'])
})

test('rating:0 finds the unrated books', () => {
  const books = [book({ title: 'Rated', userRating: 4 }), book({ title: 'Unrated' })]
  expect(titles(books, 'rating:0')).toEqual(['Unrated'])
  expect(titles(books, 'rating:>=4')).toEqual(['Rated'])
})

test('gap is my rating against the average, filtered either way and shown signed', () => {
  const books = [
    book({ title: 'Loved', userRating: 5, averageRating: '3.9' }),
    book({ title: 'Disliked', userRating: 2, averageRating: '4.1' }),
    book({ title: 'Agreed', userRating: 4, averageRating: '4.0' }),
    book({ title: 'Unrated', averageRating: '2.0' }),
  ]
  expect(titles(books, 'gap:>=0.8 sort:-gap')).toEqual(['Loved', 'Disliked'])
  expect(shown('gap:>=0.8')).toEqual(['shelf', 'rating', 'avg', 'gap'])
  const gap = booksList.shown(booksList.parse('show:gap'))[0]
  expect(books.map((book) => gap.cell?.(book))).toEqual(['+1.1', '-2.1', '0.0', '—'])
})

test('words search title, author and description, every word matching', () => {
  const books = [
    book({ title: 'Excession', authorName: 'Iain M. Banks', bookDescription: 'A Culture novel about an Outside Context Problem.' }),
    book({ title: 'Culture and Society', authorName: 'Raymond Williams' }),
    book({ title: 'The Wasp Factory', authorName: 'Iain Banks' }),
  ]
  expect(titles(books, 'culture banks')).toEqual(['Excession'])
})

test('year: is the year last read, and formats as read:', () => {
  const books = [
    book({ title: 'This year', userShelf: 'read', userFirstReadAt: '2019-04-02T07:00:00.000Z', userLastReadAt: '2025-03-04T08:00:00.000Z' }),
    book({ title: 'Last year', userShelf: 'read', userFirstReadAt: '2025-01-10T08:00:00.000Z', userLastReadAt: '2024-07-20T07:00:00.000Z' }),
    book({ title: 'Unread' }),
  ]
  expect(titles(books, 'year:2025')).toEqual(['This year'])
  expect(titles(books, 'read:2025')).toEqual(['This year'])
  expect(titles(books, 'read:>=2024-06 sort:read')).toEqual(['Last year', 'This year'])
  expect(titles(books, 'first:2025')).toEqual(['Last year'])
  expect(booksList.format(booksList.parse('year:2025 sort:-year'))).toBe('read:2025 sort:-read')
})

test('published compares in time order, BC included', () => {
  const books = [
    book({ title: 'Iliad', bookPublished: '-0750' }),
    book({ title: 'Aeneid', bookPublished: '-0019' }),
    book({ title: 'Beowulf', bookPublished: '1000' }),
    book({ title: 'Hamlet', bookPublished: '1599-01-01' }),
    book({ title: 'Dune', bookPublished: '1965-08' }),
    book({ title: 'Unknown', bookPublished: '' }),
  ]
  expect(titles(books, 'published:<1950 sort:published')).toEqual(['Iliad', 'Aeneid', 'Beowulf', 'Hamlet'])
  expect(titles(books, 'published:<0 sort:-published')).toEqual(['Aeneid', 'Iliad'])
  expect(titles(books, 'sort:published')).toEqual(['Iliad', 'Aeneid', 'Beowulf', 'Hamlet', 'Dune', 'Unknown'])
})

test('added and updated filter by date', () => {
  const books = [
    book({ title: 'Long ago', userAddedAt: '2014-02-01T08:00:00.000Z' }),
    book({ title: 'Mid 2020', userAddedAt: '2020-06-15T07:00:00.000Z', userUpdatedAt: '2024-01-01T08:00:00.000Z' }),
    book({ title: 'Recent', userAddedAt: '2026-01-01T08:00:00.000Z' }),
  ]
  expect(titles(books, 'added:<2020 sort:added')).toEqual(['Long ago'])
  expect(titles(books, 'added:<2020-06-15 sort:added')).toEqual(['Long ago'])
  expect(titles(books, 'added:<=2020-06-15 sort:added')).toEqual(['Long ago', 'Mid 2020'])
  expect(titles(books, 'updated:2024')).toEqual(['Mid 2020'])
})

test('tag: filters by my tags, and neither sorts nor shows', () => {
  const books = [book({ title: 'Kept', userTags: ['long-term'] }), book({ title: 'Other' })]
  expect(titles(books, 'tag:long-term')).toEqual(['Kept'])
  expect(booksList.parse('sort:tag show:tag').notUnderstood).toEqual(['sort:tag', 'show:tag'])
  expect(shown('tag:long-term')).toEqual(shown(''))
})

test('the help lists every books field', () => {
  expect(booksList.help().fields.map(({ key }) => key))
    .toEqual(['rating', 'read', 'first', 'avg', 'gap', 'pages', 'published', 'added', 'updated', 'reads', 'shelf', 'progress', 'title', 'author', 'tag'])
  expect(booksList.help().fields.find(({ key }) => key === 'read')?.aliases).toEqual(['year'])
})

// A read on the timeline: "2021", "February, 1997" or "May 2, 2021".
function finished(dateText: string, edition = '') {
  return { dateText, event: `Finished Reading${edition}` }
}

test('read and first filter at the precision the timeline gives, not the padded feed date', () => {
  const books = [
    // The feed pads a year to 1 January, and a month to its 1st.
    book({ title: 'Helgoland', userShelf: 'read', userFirstReadAt: '2021-01-01T08:00:00.000Z', userLastReadAt: '2021-01-01T08:00:00.000Z', timeline: [finished('2021')] }),
    book({ title: 'Bridge of Birds', userShelf: 'read', userFirstReadAt: '1997-02-01T08:00:00.000Z', userLastReadAt: '1997-02-01T08:00:00.000Z', timeline: [finished(''), { dateText: 'January, 1997', event: 'Started Reading' }, finished('February, 1997')] }),
  ]
  expect(titles(books, 'read:2021-01-01')).toEqual([])
  expect(titles(books, 'read:2021')).toEqual(['Helgoland'])
  expect(titles(books, 'year:2021')).toEqual(['Helgoland'])
  expect(titles(books, 'read:>=2021-01')).toEqual(['Helgoland'])
  expect(titles(books, 'read:<2021-06')).toEqual(['Bridge of Birds'])
  expect(titles(books, 'read:1997-02-01')).toEqual([])
  expect(titles(books, 'read:1997-02')).toEqual(['Bridge of Birds'])
  expect(titles(books, 'first:1997-01')).toEqual([])
  const [read] = booksList.shown(booksList.parse('show:read'))
  expect(books.map((book) => read.cell?.(book))).toEqual(['2021', '1997-02'])
})

test('first and last read each take their own row, and another edition\'s rows are ignored', () => {
  const books = [
    book({
      title: 'Twice',
      userShelf: 'read',
      userFirstReadAt: '2015-01-01T08:00:00.000Z',
      userLastReadAt: '2020-03-03T08:00:00.000Z',
      timeline: [finished('2015'), finished('March 3, 2020'), finished('2015', ' (Paperback Edition)')],
    }),
    // Its own finish is a day; the paperback's "2021" is another edition's.
    book({ title: 'Hardcover', userShelf: 'read', userFirstReadAt: '2021-07-06T07:00:00.000Z', userLastReadAt: '2021-07-06T07:00:00.000Z', timeline: [finished('2021', ' (Paperback Edition)'), finished('July 6, 2021')] }),
    // Read in "2021" and on 1 January 2021: the day is known.
    book({ title: 'New Year', userShelf: 'read', userFirstReadAt: '2021-01-01T08:00:00.000Z', userLastReadAt: '2021-01-01T08:00:00.000Z', timeline: [finished('2021'), finished('January 1, 2021')] }),
    // No matching row: the feed's day.
    book({ title: 'Untracked', userShelf: 'read', userFirstReadAt: '2025-03-04T08:00:00.000Z', userLastReadAt: '2025-03-04T08:00:00.000Z' }),
  ]
  expect(titles(books, 'first:2015-01-01')).toEqual([])
  expect(titles(books, 'first:2015')).toEqual(['Twice'])
  expect(titles(books, 'read:2020-03-03')).toEqual(['Twice'])
  expect(titles(books, 'read:2021-07-06')).toEqual(['Hardcover'])
  expect(titles(books, 'read:2025-03-04')).toEqual(['Untracked'])
  expect(titles(books, 'read:2021-01-01')).toEqual(['New Year'])
  // Sorted by the feed's dates.
  expect(titles(books, 'sort:read')).toEqual(['Twice', 'New Year', 'Hardcover', 'Untracked'])
})

test('a gap filter with = still shows gap, rating and avg: equal sizes differ in sign', () => {
  expect(shown('shelf:on-deck gap:0.8')).toEqual(['rating', 'avg', 'gap', 'pages'])
})
