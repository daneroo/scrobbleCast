import { booksUrl } from '../config'
import { Goodreads, type Item } from '../schema/goodreads'
import { cached, loadFeed, plainText, ready, type Download } from './fetch'

// A Book is upstream's Item, its description as plain text: search indexes it.
export type Book = Item

// The books feed through `download`, and one book found in it. S3's
// `Last-Modified` says when the feed was generated.
export function booksFeed(download?: Download) {
  const getBooks = cached(async () => {
    const feed = await loadFeed({
      name: 'books',
      url: booksUrl,
      schema: Goodreads,
      time: (_, headers) => ({ label: 'updated', at: validDate(headers.get('Last-Modified')) }),
    }, download)
    return { ...feed, data: feed.data.map((book): Book => ({ ...book, bookDescription: plainText(book.bookDescription) })) }
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
