import { booksUrl } from '../config'
import { Goodreads, type ExclusiveShelf, type Item } from '../schema/goodreads'
import { loadFeed, mapData, plainText, ready, shareFeed, type Feed, type FeedOptions } from './fetch'

// A Book is upstream's Item, its description and review as plain text: search
// indexes the description.
export type Book = Item

// The reader's shelves, in their usual order, with the short names the site
// shows for them: a shelf added upstream fails the typecheck until it has one.
// A name that isn't a shelf shows as given.
export const shelfNames: Record<ExclusiveShelf, string> = {
  'currently-reading': 'Reading',
  'on-deck': 'On deck',
  'to-read': 'To read',
  read: 'Read',
  'did-not-finish': 'DNF',
}

export function shelfName(shelf: string) {
  const names: Partial<Record<string, string>> = shelfNames
  return names[shelf] ?? shelf
}

// The books feed, with a saved copy, and one book found in it. S3's
// `Last-Modified` says when the feed was generated.
export function booksFeed(options: FeedOptions = {}) {
  const getBooks = shareFeed(() => mapData(loadFeed({
    name: 'books',
    url: booksUrl,
    schema: Goodreads,
    time: (_, headers) => ({ label: 'updated', at: validDate(headers.get('Last-Modified')) }),
    save: true,
  }, options), (books) => books.map((book): Book => ({
    ...book,
    bookDescription: plainText(book.bookDescription, { everyBlock: true }),
    userReview: plainText(book.userReview, { everyBlock: true }),
  }))))

  // Ready at once if this tab already has the books feed. A book missing from
  // the saved copy may be new: look for it in the fresh copy before saying
  // it isn't there.
  function getBook(bookId: string): Promise<Book | undefined> {
    const find = (feed: Feed<Book[]>) => feed.data.find((book) => book.bookId === bookId)
    const books = getBooks() // Starts a load, or retries a failed refresh.
    const loaded = getBooks.loaded()
    const book = loaded && find(loaded)
    if (book || loaded?.source === 'fresh') return ready(book)
    return books.then((feed) => find(feed) ?? (feed.source === 'saved' ? getBooks.settled().then(find) : undefined))
  }

  return { getBooks, getBook }
}

export const { getBooks, getBook } = booksFeed()

function validDate(value: string | null) {
  const date = value ? new Date(value) : undefined
  return date && !Number.isNaN(date.getTime()) ? date : undefined
}
