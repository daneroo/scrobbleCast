import { booksUrl } from '../config'
import { Goodreads, type Item } from '../schema/goodreads'
import { cached, loadFeed, plainText, type Download } from './fetch'

// A Book is upstream's Item, its description as plain text: search indexes it.
export type Book = Item

// The books feed through `download`. S3's `Last-Modified` says when it was
// generated.
export function booksFeed(download?: Download) {
  return cached(async () => {
    const feed = await loadFeed({
      name: 'books',
      url: booksUrl,
      schema: Goodreads,
      time: (_, headers) => ({ label: 'updated', at: validDate(headers.get('Last-Modified')) }),
    }, download)
    return { ...feed, data: feed.data.map((book): Book => ({ ...book, bookDescription: plainText(book.bookDescription) })) }
  })
}

export const getBooks = booksFeed()

function validDate(value: string | null) {
  const date = value ? new Date(value) : undefined
  return date && !Number.isNaN(date.getTime()) ? date : undefined
}
