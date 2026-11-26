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
