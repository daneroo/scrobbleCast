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

// The source and first title of each copy loaded.
async function copies(feed: AsyncIterable<Feed<typeof example>>) {
  const shown: [string, string][] = []
  for await (const copy of feed) shown.push([copy.source, copy.data[0].title])
  return shown
}

test('with a saved copy, the saved data comes first, then the fresh data', async () => {
  const { savedCopies } = fakeSavedCopies({ [url]: [first] })

  expect(await copies(loadFeed(books, { download: respond([second]), savedCopies }))).toEqual([['saved', first.title], ['fresh', second.title]])
})

test('the fresh copy becomes the saved copy', async () => {
  const { bodies, savedCopies } = fakeSavedCopies()

  await copies(loadFeed(books, { download: respond([second]), savedCopies }))

  await expect.poll(() => bodies[url]).toEqual([second])
})

test('a failed refresh keeps the saved data', async () => {
  const { bodies, savedCopies } = fakeSavedCopies({ [url]: [first] })

  expect(await copies(loadFeed(books, { download: fail, savedCopies }))).toEqual([['saved', first.title]])
  expect(bodies[url]).toEqual([first])
})

test('a saved copy that fails the schema check is discarded, and the fresh data is used', async () => {
  const { bodies, savedCopies } = fakeSavedCopies({ [url]: [{ title: 'no longer a book' }] })

  expect(await copies(loadFeed(books, { download: respond([second]), savedCopies }))).toEqual([['fresh', second.title]])
  await expect.poll(() => bodies[url]).toEqual([second])
})

test('with no saved copy, a failed fetch raises', async () => {
  const { savedCopies } = fakeSavedCopies()

  await expect(copies(loadFeed(books, { download: fail, savedCopies }))).rejects.toThrow('Could not load books (HTTP 503).')
})

test('with only a bad saved copy, a failed fetch raises, and the bad copy is gone', async () => {
  const { bodies, savedCopies } = fakeSavedCopies({ [url]: { not: 'a feed' } })

  await expect(copies(loadFeed(books, { download: fail, savedCopies }))).rejects.toThrow('Could not load books (HTTP 503).')
  await expect.poll(() => url in bodies).toBe(false)
})

test('a feed that is not saved never reads or writes a saved copy', async () => {
  const { bodies, savedCopies } = fakeSavedCopies({ [url]: [first] })

  expect(await copies(loadFeed({ ...books, save: false }, { download: respond([second]), savedCopies }))).toEqual([['fresh', second.title]])
  expect(bodies[url]).toEqual([first])
})
