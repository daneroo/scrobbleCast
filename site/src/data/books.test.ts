// @vitest-environment happy-dom
import { expect, test } from 'vite-plus/test'
import example from '../schema/goodreads-example.json'
import { booksFeed } from './books'

test('the books feed is updated when S3 last modified it', async () => {
  const download = async () => new Response(JSON.stringify(example), {
    headers: { 'Last-Modified': 'Mon, 23 Nov 2026 04:23:33 GMT' },
  })
  const getBooks = booksFeed(download)

  const feed = await getBooks()

  expect(feed.time).toEqual({ label: 'updated', at: new Date('2026-11-23T04:23:33Z') })
  expect(feed.data).toHaveLength(example.length)
})
