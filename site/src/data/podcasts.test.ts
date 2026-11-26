// @vitest-environment happy-dom
import { expect, test } from 'vite-plus/test'
import example from '../schema/podcast-example.json'
import { noticeBoard } from '../notices'
import { fakeSavedCopies } from './fake-saved-copies'
import type { EpisodeRecord, PodcastRecord } from '../schema/podcast'
import { podcastFeeds } from './podcasts'

const [syntax] = example.podcasts

let lastId = 0

// A podcast record with plain defaults, and no artwork.
function podcastRecord(fields: Partial<PodcastRecord> = {}): PodcastRecord {
  const uuid = `podcast-${++lastId}`
  return {
    uuid,
    title: `Podcast ${uuid}`,
    author: 'An Author',
    description: '',
    meta: { __type: 'podcast', __firstSeen: '2020-01-01T00:00:00Z', __lastUpdated: '2026-11-01T00:00:00Z' },
    ...fields,
  }
}

// An episode record with plain defaults: an hour long, never played.
function episodeRecord(fields: Partial<EpisodeRecord> = {}): EpisodeRecord {
  const uuid = `episode-${++lastId}`
  return {
    uuid,
    title: `Episode ${uuid}`,
    podcast_uuid: 'no-such-podcast',
    url: `https://example.com/${uuid}.mp3`,
    published_at: '2026-11-20T10:00:00Z',
    duration: 3600,
    played_up_to: 0,
    playing_status: 1,
    meta: { __type: 'episode', __lastUpdated: '2026-11-20T10:00:00Z' },
    history: {},
    ...fields,
  }
}

// A fake history API serving `records` (the example records by default); it
// logs each request.
function fakeHistory(records: { podcasts: object[]; episodes: object[] } = example) {
  const requests: URLSearchParams[] = []
  const download = async (url: string) => {
    const params = new URL(url).searchParams
    requests.push(params)
    const type = params.get('type')
    const uuid = params.get('uuid')
    const served: { uuid: string }[] = type === 'podcast' ? records.podcasts as PodcastRecord[] : records.episodes as EpisodeRecord[]
    const found = uuid ? served.filter((record) => record.uuid === uuid) : served
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

test('asking for episodes retries a failed refresh of the podcast feed', async () => {
  const { download } = fakeHistory()
  const { savedCopies } = fakeSavedCopies()
  await podcastFeeds({ download, savedCopies }).getPodcasts.settled()
  let podcastsFail = true
  const flaky = (url: string) => podcastsFail && url.includes('type=podcast')
    ? Promise.resolve(new Response('', { status: 503 }))
    : download(url)
  const { getEpisodes, getPodcasts } = podcastFeeds({ download: flaky, savedCopies, notices: noticeBoard() })
  await getEpisodes()
  expect((await getPodcasts.settled()).source).toBe('saved')

  podcastsFail = false
  await getEpisodes()

  await expect.poll(() => getPodcasts.loaded()?.source).toBe('fresh')
})

// The episodes the feed makes of `episodes`, with `podcasts` as the podcast
// feed, by title.
async function episodesOf(episodes: EpisodeRecord[], podcasts: PodcastRecord[] = []) {
  const { getEpisodes } = podcastFeeds({ download: fakeHistory({ podcasts, episodes }).download })
  const feed = await getEpisodes()
  return new Map(feed.data.map((episode) => [episode.title, episode]))
}

test('an episode’s status: 0 or 1 is unplayed, 2 in progress, 3 finished, missing none', async () => {
  const { playing_status: _, ...noStatus } = episodeRecord({ title: 'missing' })
  const episodes = await episodesOf([
    episodeRecord({ title: '0', playing_status: 0 }),
    episodeRecord({ title: '1', playing_status: 1 }),
    episodeRecord({ title: '2', playing_status: 2 }),
    episodeRecord({ title: '3', playing_status: 3 }),
    noStatus,
  ])
  expect([...episodes].map(([title, { status }]) => [title, status])).toEqual([
    ['0', 'unplayed'],
    ['1', 'unplayed'],
    ['2', 'in-progress'],
    ['3', 'finished'],
    ['missing', undefined],
  ])
})

test('an episode’s progress is the furthest played over the duration, as a percentage', async () => {
  const episodes = await episodesOf([
    episodeRecord({ title: 'quarter', duration: 3600, played_up_to: 900 }),
    episodeRecord({ title: 'furthest in history', duration: '2000', played_up_to: 500, history: { played_up_to: { '2026-11-19T10:00:00Z': 1500 } } }),
    episodeRecord({ title: 'unplayed', duration: 3600 }),
  ])
  expect(episodes.get('quarter')?.progress).toBe(25)
  expect(episodes.get('furthest in history')?.progress).toBe(75)
  expect(episodes.get('unplayed')?.progress).toBe(0)
})

test('an episode with no duration has no progress', async () => {
  const { duration: _, ...noDuration } = episodeRecord({ title: 'no duration', played_up_to: 900 })
  const episodes = await episodesOf([noDuration, episodeRecord({ title: 'zero', duration: 0, played_up_to: 900 })])
  expect(episodes.get('no duration')?.progress).toBeUndefined()
  expect(episodes.get('zero')?.progress).toBeUndefined()
})

test('an episode’s published date is ISO 8601, older records’ UTC time too, and empty when missing', async () => {
  const { published_at: _, ...unpublished } = episodeRecord({ title: 'missing' })
  const episodes = await episodesOf([
    episodeRecord({ title: 'iso', published_at: '2026-11-21T13:00:00Z' }),
    episodeRecord({ title: 'older', published_at: '2018-12-12 16:17:39' }),
    unpublished,
  ])
  expect(episodes.get('iso')?.published).toBe('2026-11-21T13:00:00Z')
  expect(episodes.get('older')?.published).toBe('2018-12-12T16:17:39Z')
  expect(episodes.get('missing')?.published).toBe('')
})

test('an episode carries its audio URL, and its podcast’s title and artwork from the podcast feed', async () => {
  const pictured = podcastRecord({ title: 'Pictured', thumbnail_url: 'https://example.com/art.png' })
  const plain = podcastRecord({ title: 'Plain' })
  const episodes = await episodesOf([
    episodeRecord({ title: 'pictured', podcast_uuid: pictured.uuid, url: 'https://example.com/a.mp3' }),
    episodeRecord({ title: 'plain', podcast_uuid: plain.uuid }),
    episodeRecord({ title: 'orphan' }),
  ], [pictured, plain])
  expect(episodes.get('pictured')).toMatchObject({ url: 'https://example.com/a.mp3', podcastId: pictured.uuid, podcastTitle: 'Pictured', artwork: 'https://example.com/art.png' })
  expect(episodes.get('plain')).toMatchObject({ podcastTitle: 'Plain', artwork: '' })
  expect(episodes.get('orphan')).toMatchObject({ podcastTitle: '', artwork: '' })
})

test('one episode found by uuid carries its podcast’s artwork too', async () => {
  const [played] = example.episodes
  const { getEpisode } = podcastFeeds({ download: fakeHistory({ podcasts: [...example.podcasts, podcastRecord({ uuid: played.podcast_uuid, thumbnail_url: 'https://example.com/art.png' })], episodes: example.episodes }).download })

  expect(await getEpisode(played.uuid)).toMatchObject({ status: 'finished', published: '2026-11-21T13:00:00Z', artwork: 'https://example.com/art.png' })
})
