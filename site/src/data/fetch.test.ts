// @vitest-environment happy-dom
import { expect, test } from 'vite-plus/test'
import { Goodreads } from '../schema/goodreads'
import example from '../schema/goodreads-example.json'
import { fakeSavedCopies } from './fake-saved-copies'
import { noticeBoard } from '../notices'
import { loadFeed, shareFeed, type Feed, type FeedConfig } from './fetch'

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

test('a failed refresh posts a refresh failed notice with the saved copy’s time', async () => {
  const { savedCopies } = fakeSavedCopies({ [url]: [first] })
  const notices = noticeBoard()
  const at = new Date(2026, 10, 23, 0, 23, 33)

  await copies(loadFeed({ ...books, time: () => ({ label: 'updated', at }) }, { download: fail, savedCopies, notices }))

  expect(notices.get()).toEqual({
    books: { kind: 'warning', text: 'Books: refresh failed, showing saved copy from 2026-11-23 00:23:33' },
  })
})

test('a saved copy that fails the schema check is discarded, and the fresh data is used', async () => {
  const { bodies, savedCopies } = fakeSavedCopies({ [url]: [{ title: 'no longer a book' }] })

  expect(await copies(loadFeed(books, { download: respond([second]), savedCopies }))).toEqual([['fresh', second.title]])
  await expect.poll(() => bodies[url]).toEqual([second])
})

test('a discarded saved copy posts a notice that stays after the fresh data', async () => {
  const { savedCopies } = fakeSavedCopies({ [url]: [{ title: 'no longer a book' }] })
  const notices = noticeBoard()

  await copies(loadFeed(books, { download: respond([second]), savedCopies, notices }))

  expect(notices.get()).toEqual({ books: { kind: 'warning', text: 'Books: saved copy discarded (schema mismatch)' } })
})

test('a notice clears when its feed next loads its fresh data', async () => {
  const { savedCopies } = fakeSavedCopies({ [url]: [first] })
  const notices = noticeBoard()
  await copies(loadFeed(books, { download: fail, savedCopies, notices }))

  await copies(loadFeed(books, { download: respond([second]), savedCopies, notices }))

  expect(notices.get()).toEqual({})
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

test('after a failed refresh, the next request for the feed tries again', async () => {
  const { savedCopies } = fakeSavedCopies({ [url]: [first] })
  const notices = noticeBoard()
  let downloads = 0
  let download = fail
  const shared = shareFeed(() => loadFeed(books, { download: () => { downloads++; return download() }, savedCopies, notices }))

  expect((await shared()).source).toBe('saved')
  await expect.poll(() => notices.get().books).toBeDefined()
  expect(shared.loaded()?.source).toBe('saved')

  download = respond([second])
  await shared()
  await expect.poll(() => shared.loaded()?.source).toBe('fresh')
  expect(shared.loaded()?.data[0].title).toBe(second.title)
  expect(downloads).toBe(2)
})

test('a retry keeps the copy shown, even with the saved copy gone and the fetch failing again', async () => {
  const { bodies, savedCopies } = fakeSavedCopies({ [url]: [first] })
  const shared = shareFeed(() => loadFeed(books, { download: fail, savedCopies, notices: noticeBoard() }))
  expect((await shared.settled()).source).toBe('saved')
  delete bodies[url]

  expect(shared()).toMatchObject({ status: 'fulfilled', value: { source: 'saved' } })
  expect((await shared.settled()).source).toBe('saved')
  expect(shared.loaded()?.data[0].title).toBe(first.title)
})

test('settling a feed that fails raises the error, and nothing else', async () => {
  const { savedCopies } = fakeSavedCopies()
  const shared = shareFeed(() => loadFeed(books, { download: fail, savedCopies, notices: noticeBoard() }))

  await expect(shared.settled()).rejects.toThrow('Could not load books (HTTP 503).')
})
