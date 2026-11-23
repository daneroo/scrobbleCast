import { booksUrl } from '../config'
import { Goodreads, type Item } from '../schema/goodreads'
import { cached, fetchJson, plainText } from './fetch'

// A Book is upstream's Item, its description as plain text: search indexes it.
export type Book = Item

export const getBooks = cached(async (): Promise<Book[]> => {
  const books = await fetchJson(booksUrl, 'books', Goodreads)
  return books.map((book) => ({ ...book, bookDescription: plainText(book.bookDescription) }))
})
