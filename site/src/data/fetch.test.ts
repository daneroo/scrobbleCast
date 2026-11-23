// @vitest-environment happy-dom
import { expect, test } from 'vite-plus/test'
import { Goodreads } from '../schema/goodreads'
import example from '../schema/goodreads-example.json'
import { fakeSavedCopies } from './fake-saved-copies'
import { loadFeed, type Feed, type FeedConfig } from './fetch'

const url = 'https://example.com/goodreads.json'
const books: FeedConfig<typeof example> = {
  name: 'books',
  url,
  schema: Goodreads,
  time: () => ({ label: 'updated', at: undefined }),
  save: true,
}
const [first, second] = example

const respond = (body: unknown) => async () => new Response(JSON.stringify(body))
const fail = async () => new Response('', { status: 503 })

async function copies<T>(feed: AsyncIterable<Feed<T>>) {
  const shown: Feed<T>[] = []
  for await (const copy of feed) shown.push(copy)
  return shown
}

test('with a saved copy, the saved data comes first, then the fresh data', async () => {
  const { saved } = fakeSavedCopies({ [url]: [first] })

  const shown = await copies(loadFeed(books, { download: respond([second]), saved }))

  expect(shown.map((feed) => [feed.source, feed.data[0].title])).toEqual([['saved', first.title], ['fresh', second.title]])
})

test('the fresh copy becomes the saved copy', async () => {
  const { bodies, saved } = fakeSavedCopies()

  await copies(loadFeed(books, { download: respond([second]), saved }))

  await expect.poll(() => bodies[url]).toEqual([second])
})

test('a failed refresh keeps the saved data', async () => {
  const { bodies, saved } = fakeSavedCopies({ [url]: [first] })

  const shown = await copies(loadFeed(books, { download: fail, saved }))

  expect(shown.map((feed) => [feed.source, feed.data[0].title])).toEqual([['saved', first.title]])
  expect(bodies[url]).toEqual([first])
})

test('a saved copy that fails the schema check is discarded, and the fresh data is used', async () => {
  const { bodies, saved } = fakeSavedCopies({ [url]: [{ title: 'no longer a book' }] })

  const shown = await copies(loadFeed(books, { download: respond([second]), saved }))

  expect(shown.map((feed) => [feed.source, feed.data[0].title])).toEqual([['fresh', second.title]])
  await expect.poll(() => bodies[url]).toEqual([second])
})

test('with no usable saved copy, a failed fetch raises, and the bad saved copy is gone', async () => {
  const { bodies, saved } = fakeSavedCopies({ [url]: { not: 'a feed' } })

  await expect(copies(loadFeed(books, { download: fail, saved }))).rejects.toThrow('Could not load books (HTTP 503).')
  await expect.poll(() => url in bodies).toBe(false)
})

test('a feed that is not saved never reads or writes a saved copy', async () => {
  const { bodies, saved } = fakeSavedCopies({ [url]: [first] })

  const shown = await copies(loadFeed({ ...books, save: false }, { download: respond([second]), saved }))

  expect(shown.map((feed) => [feed.source, feed.data[0].title])).toEqual([['fresh', second.title]])
  expect(bodies[url]).toEqual([first])
})
