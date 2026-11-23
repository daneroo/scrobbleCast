// @vitest-environment happy-dom
import { expect, test } from 'vite-plus/test'
import example from '../schema/podcast-example.json'
import { podcastFeeds } from './podcasts'

const [syntax] = example.podcasts

// A fake history API serving the example records; it logs each request.
function fakeHistory() {
  const requests: URLSearchParams[] = []
  const download = async (url: string) => {
    const params = new URL(url).searchParams
    requests.push(params)
    const type = params.get('type')
    const uuid = params.get('uuid')
    const records = type === 'podcast' ? example.podcasts : example.episodes
    const found = uuid ? records.filter((record) => record.uuid === uuid) : records
    return new Response(JSON.stringify(found))
  }
  return { requests, download }
}

test('without the podcast feed loaded, finding one podcast fetches it by uuid', async () => {
  const { requests, download } = fakeHistory()
  const { getPodcast } = podcastFeeds(download)

  const podcast = await getPodcast(syntax.uuid)

  expect(podcast?.title).toBe(syntax.title)
  expect(requests.map((params) => params.get('uuid'))).toEqual([syntax.uuid])
})

test('with the podcast feed loaded, finding one podcast makes no request', async () => {
  const { requests, download } = fakeHistory()
  const { getPodcasts, getPodcast } = podcastFeeds(download)
  await getPodcasts()
  requests.length = 0

  const podcast = await getPodcast(syntax.uuid)

  expect(podcast?.title).toBe(syntax.title)
  expect(requests).toEqual([])
})

test('an unknown podcast uuid finds nothing', async () => {
  const { getPodcasts, getPodcast } = podcastFeeds(fakeHistory().download)
  await getPodcasts()

  expect(await getPodcast('no-such-uuid')).toBeUndefined()
})

test('finding one episode fetches only that episode and its podcast', async () => {
  const [played] = example.episodes
  const { requests, download } = fakeHistory()
  const { getEpisode } = podcastFeeds(download)

  const episode = await getEpisode(played.uuid)

  expect(episode?.title).toBe("Surely You Can't Be Serious")
  expect(requests.map((params) => `${params.get('type')} ${params.get('uuid')}`)).toEqual([
    `episode ${played.uuid}`,
    `podcast ${played.podcast_uuid}`,
  ])
})

test('the podcast feed’s last change is its newest __lastUpdated', async () => {
  const { getPodcasts } = podcastFeeds(fakeHistory().download)

  const feed = await getPodcasts()

  expect(feed.time).toEqual({ label: 'last change', at: new Date('2026-11-20T17:20:00Z') })
})

test('the episode feed’s last change is its newest __lastUpdated', async () => {
  const { getEpisodes } = podcastFeeds(fakeHistory().download)

  const feed = await getEpisodes()

  expect(feed.time).toEqual({ label: 'last change', at: new Date('2026-11-23T00:10:00Z') })
})
