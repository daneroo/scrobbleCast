// @vitest-environment happy-dom
import { expect, test } from 'vite-plus/test'
import example from '../schema/podcast-example.json'
import { fakeSavedCopies } from './fake-saved-copies'
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
  const { getPodcast } = podcastFeeds({ download })

  const podcast = await getPodcast(syntax.uuid)

  expect(podcast?.title).toBe(syntax.title)
  expect(requests.map((params) => params.get('uuid'))).toEqual([syntax.uuid])
})

test('with the podcast feed loaded, finding one podcast makes no request', async () => {
  const { requests, download } = fakeHistory()
  const { getPodcasts, getPodcast } = podcastFeeds({ download })
  await getPodcasts()
  requests.length = 0

  const podcast = await getPodcast(syntax.uuid)

  expect(podcast?.title).toBe(syntax.title)
  expect(requests).toEqual([])
})

test('an unknown podcast uuid finds nothing', async () => {
  const { getPodcasts, getPodcast } = podcastFeeds({ download: fakeHistory().download })
  await getPodcasts()

  expect(await getPodcast('no-such-uuid')).toBeUndefined()
})

test('finding one episode fetches only that episode and its podcast', async () => {
  const [played] = example.episodes
  const { requests, download } = fakeHistory()
  const { getEpisode } = podcastFeeds({ download })

  const episode = await getEpisode(played.uuid)

  expect(episode?.title).toBe("Surely You Can't Be Serious")
  expect(requests.map((params) => `${params.get('type')} ${params.get('uuid')}`)).toEqual([
    `episode ${played.uuid}`,
    `podcast ${played.podcast_uuid}`,
  ])
})

test('the podcast feed’s last change is its newest __lastUpdated', async () => {
  const { getPodcasts } = podcastFeeds({ download: fakeHistory().download })

  const feed = await getPodcasts()

  expect(feed.time).toEqual({ label: 'last change', at: new Date('2026-11-20T17:20:00Z') })
})

test('the episode feed’s last change is its newest __lastUpdated', async () => {
  const { getEpisodes } = podcastFeeds({ download: fakeHistory().download })

  const feed = await getEpisodes()

  expect(feed.time).toEqual({ label: 'last change', at: new Date('2026-11-23T00:10:00Z') })
})

test('the episode feed loads without waiting for the podcast feed', async () => {
  const { download } = fakeHistory()
  const { getEpisodeFeed } = podcastFeeds({
    download: (url) => new URL(url).searchParams.get('type') === 'podcast' ? new Promise(() => {}) : download(url),
  })

  const feed = await getEpisodeFeed()

  expect(feed.data.map((episode) => episode.title)).toContain("Surely You Can't Be Serious")
})

// React's `use()` reads a promise's `status` and `value` without suspending.
test('with the podcast feed loaded, a podcast is ready at once', async () => {
  const { getPodcasts, getPodcast } = podcastFeeds({ download: fakeHistory().download })
  await getPodcasts()

  expect(getPodcast(syntax.uuid)).toMatchObject({ status: 'fulfilled', value: { title: syntax.title } })
})

test('the podcast feed is saved, the episode feed never', async () => {
  const { used, savedCopies } = fakeSavedCopies()
  const { getPodcasts, getEpisodeFeed } = podcastFeeds({ download: fakeHistory().download, savedCopies })

  await Promise.all([getPodcasts(), getEpisodeFeed()])

  expect(used.map((url) => new URL(url).searchParams.get('type'))).toEqual(['podcast', 'podcast'])
})
