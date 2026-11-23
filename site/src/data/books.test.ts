// @vitest-environment happy-dom
import { expect, test } from 'vite-plus/test'
import example from '../schema/goodreads-example.json'
import { booksFeed } from './books'

test('the books feed is updated when S3 last modified it', async () => {
  const download = async () => new Response(JSON.stringify(example), {
    headers: { 'Last-Modified': 'Mon, 23 Nov 2026 04:23:33 GMT' },
  })
  const { getBooks } = booksFeed(download)

  const feed = await getBooks()

  expect(feed.time).toEqual({ label: 'updated', at: new Date('2026-11-23T04:23:33Z') })
  expect(feed.data).toHaveLength(example.length)
})

// React's `use()` reads a promise's `status` and `value` without suspending.
test('once loaded, the books feed is ready at once', async () => {
  const { getBooks } = booksFeed(async () => new Response(JSON.stringify(example)))
  const feed = await getBooks()

  expect(getBooks()).toMatchObject({ status: 'fulfilled', value: feed })
})

test('once the books feed is loaded, a book is ready at once', async () => {
  const [first] = example
  const { getBooks, getBook } = booksFeed(async () => new Response(JSON.stringify(example)))
  await getBooks()

  expect(getBook(first.bookId)).toMatchObject({ status: 'fulfilled', value: { title: first.title } })
  expect(await getBook('no-such-book')).toBeUndefined()
})
