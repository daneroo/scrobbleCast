import { booksUrl } from '../config'
import { Goodreads, type Item } from '../schema/goodreads'
import { loadFeed, plainText, ready, shareFeed, type FeedOptions } from './fetch'

// A Book is upstream's Item, its description as plain text: search indexes it.
export type Book = Item

// The books feed, with a saved copy, and one book found in it. S3's
// `Last-Modified` says when the feed was generated.
export function booksFeed(options?: FeedOptions) {
  const getBooks = shareFeed(async function* () {
    const copies = loadFeed({
      name: 'books',
      url: booksUrl,
      schema: Goodreads,
      time: (_, headers) => ({ label: 'updated', at: validDate(headers.get('Last-Modified')) }),
      save: true,
    }, options)
    for await (const feed of copies) {
      yield { ...feed, data: feed.data.map((book): Book => ({ ...book, bookDescription: plainText(book.bookDescription) })) }
    }
  })

  // Ready at once if this tab already has the books feed.
  function getBook(bookId: string): Promise<Book | undefined> {
    const find = (books: Book[]) => books.find((book) => book.bookId === bookId)
    const loaded = getBooks.loaded()
    return loaded ? ready(find(loaded.data)) : getBooks().then((feed) => find(feed.data))
  }

  return { getBooks, getBook }
}

export const { getBooks, getBook } = booksFeed()

function validDate(value: string | null) {
  const date = value ? new Date(value) : undefined
  return date && !Number.isNaN(date.getTime()) ? date : undefined
}
