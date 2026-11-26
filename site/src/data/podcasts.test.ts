// @vitest-environment happy-dom
import { afterEach, beforeEach, expect, test, vi } from 'vite-plus/test'
import example from '../schema/podcast-example.json'
import { localTime } from '../format'
import { noticeBoard } from '../notices'
import { fakeSavedCopies } from './fake-saved-copies'
import type { EpisodeRecord, PodcastRecord } from '../schema/podcast'
import { cacheTtlMs } from '../config'
import { subscribeShownCopies } from './fetch'
import { countPlayedSince, podcastFeeds } from './podcasts'

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

// Today, for every test: the example records changed in the last 30 days.
const now = new Date(2026, 10, 26, 12)
beforeEach(() => { vi.setSystemTime(now) })
afterEach(() => { vi.useRealTimers() })

// A fake history API serving `records` (the example records by default), as
// the real one does: by `uuid`, or those whose last update is in
// `[since, before)`, newest first. It logs each request.
function fakeHistory(records: { podcasts: object[]; episodes: object[] } = example) {
  const requests: URLSearchParams[] = []
  const download = async (url: string) => {
    const params = new URL(url).searchParams
    requests.push(params)
    const type = params.get('type')
    const uuid = params.get('uuid')
    const since = Date.parse(params.get('since') ?? '0000-01-01')
    const before = Date.parse(params.get('before') ?? '9999-12-31')
    const served = (type === 'podcast' ? records.podcasts : records.episodes) as (PodcastRecord | EpisodeRecord)[]
    const found = uuid
      ? served.filter((record) => record.uuid === uuid)
      : served
          .filter(({ meta }) => since <= Date.parse(meta.__lastUpdated) && Date.parse(meta.__lastUpdated) < before)
          .sort((a, b) => Date.parse(b.meta.__lastUpdated) - Date.parse(a.meta.__lastUpdated))
    return new Response(JSON.stringify(found))
  }
  return { requests, download }
}

// A request's range of last updates, as local days: `since..before`, with
// `now` for no `before`.
function range(params: URLSearchParams) {
  const local = (iso: string | null) => iso ? localTime(new Date(iso)) : 'now'
  return `${local(params.get('since'))}..${local(params.get('before'))}`
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

test('after the catalog expires, a podcast detail looks up the latest record by uuid', async () => {
  const record = podcastRecord()
  const records = { podcasts: [record], episodes: [] }
  const { requests, download } = fakeHistory(records)
  const { getPodcasts, getPodcast } = podcastFeeds({ download })
  await getPodcasts.settled()

  vi.setSystemTime(now.getTime() + cacheTtlMs + 1)
  records.podcasts[0] = { ...record, title: 'New title' }
  expect((await getPodcast(record.uuid))?.title).toBe('New title')
  expect(requests.at(-1)?.get('uuid')).toBe(record.uuid)
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

// The window

test('the episode feed opens on the window: what changed since the start of the day 30 days back', async () => {
  const { requests, download } = fakeHistory()
  const { getEpisodeFeed } = podcastFeeds({ download })

  const feed = await getEpisodeFeed()

  expect(requests.map(range)).toEqual(['2026-10-27 00:00:00..now'])
  expect(feed.since).toEqual(new Date(2026, 9, 27))
})

// An episode record that last changed at `lastUpdated`.
function changedAt(lastUpdated: string, fields: Partial<EpisodeRecord> = {}) {
  return episodeRecord({ ...fields, meta: { __type: 'episode', __lastUpdated: lastUpdated } })
}

test('widening fetches the 30 days before the window, merges them by uuid keeping the newer record, and moves since back', async () => {
  const replayed = changedAt('2026-11-20T10:00:00Z', { title: 'replayed, newer' })
  const { requests, download } = fakeHistory({
    podcasts: [],
    episodes: [
      replayed,
      changedAt('2026-10-28T10:00:00Z', { title: 'in the window' }),
      changedAt('2026-10-20T10:00:00Z', { uuid: replayed.uuid, title: 'replayed, older' }),
      changedAt('2026-10-01T10:00:00Z', { title: 'in the step' }),
      changedAt('2026-09-01T10:00:00Z', { title: 'further back' }),
    ],
  })
  const { getEpisodeFeed, widen } = podcastFeeds({ download, notices: noticeBoard() })
  await getEpisodeFeed()

  await widen()

  const feed = await getEpisodeFeed()
  expect(requests.map(range)).toEqual(['2026-10-27 00:00:00..now', '2026-09-27 00:00:00..2026-10-27 00:00:00'])
  expect(feed.since).toEqual(new Date(2026, 8, 27))
  expect(feed.data.map((episode) => episode.title)).toEqual(['replayed, newer', 'in the window', 'in the step'])
})

// Five episodes, one in each 30 days back from today, the newest first.
function monthly() {
  return ['2026-11-20', '2026-10-20', '2026-09-20', '2026-08-20', '2026-07-20'].map((day) => changedAt(`${day}T10:00:00Z`, { title: day }))
}

test('the played count uses playback within the window, including its start', async () => {
  const start = new Date(2026, 9, 27)
  const justBefore = new Date(start.getTime() - 1)
  const { download } = fakeHistory({
    podcasts: [],
    episodes: [
      changedAt('2026-11-20T10:00:00Z', { history: { played_up_to: { [start.toISOString()]: 100 } } }),
      changedAt('2026-11-20T10:00:00Z', { history: { played_up_to: { [justBefore.toISOString()]: 100 } } }),
      changedAt('2026-11-20T10:00:00Z', { played_up_to: 100 }),
      changedAt('2026-11-20T10:00:00Z'),
    ],
  })
  const { getEpisodeFeed, widen } = podcastFeeds({ download, notices: noticeBoard() })

  expect(countPlayedSince(await getEpisodeFeed())).toBe(1)
  await widen()
  expect(countPlayedSince(await getEpisodeFeed())).toBe(2)
})

test('the podcast catalog is ready while the first episode copy is still loading', async () => {
  const record = podcastRecord({ url: 'https://example.com/podcast', dateAdded: '2026-10-18T09:00:00Z' })
  const { download, answer } = heldHistory({ podcasts: [record, podcastRecord({ url: null }), podcastRecord()], episodes: [] })
  const { getPodcastsInWindow } = podcastFeeds({ download })
  const { episodes, podcasts } = getPodcastsInWindow()
  answer(1)

  const catalog = await podcasts
  expect(catalog.data[0]).toMatchObject({ url: 'https://example.com/podcast', added: '2026-10-18T09:00:00Z' })
  expect(catalog.data[1].added).toBeUndefined()
  expect(catalog.data[1].url).toBeUndefined()
  expect(catalog.data[2].url).toBeUndefined()
  expect(catalog.data.map(({ playTotals }) => playTotals)).toEqual([undefined, undefined, undefined])

  answer(0)
  await episodes
  const { podcasts: filled } = getPodcastsInWindow()
  expect(filled).toMatchObject({ status: 'fulfilled' })
  expect((await filled).data.map(({ playTotals }) => playTotals)).toEqual([
    { plays: 0, listenedSeconds: 0 }, { plays: 0, listenedSeconds: 0 }, { plays: 0, listenedSeconds: 0 },
  ])
})

test('a failed first episode download leaves the catalog ready while the episode window retries', async () => {
  const record = podcastRecord()
  const { download, answer } = heldHistory({ podcasts: [record], episodes: [] })
  const { getPodcastsInWindow } = podcastFeeds({ download })
  const first = getPodcastsInWindow()
  answer(0, new Response('', { status: 503 }))
  answer(1)

  await expect(first.episodes).rejects.toThrow('HTTP 503')
  expect((await first.podcasts).data[0].uuid).toBe(record.uuid)
  const retry = getPodcastsInWindow()
  expect(retry.podcasts).toMatchObject({ status: 'fulfilled' })
  expect((await retry.podcasts).data[0].playTotals).toBeUndefined()

  answer(2)
  await retry.episodes
  expect((await getPodcastsInWindow().podcasts).data[0].playTotals).toEqual({ plays: 0, listenedSeconds: 0 })
})

test('podcast totals count played episodes in the feed and use playback dates for last played', async () => {
  const podcast = podcastRecord()
  const idle = podcastRecord()
  const undated = podcastRecord()
  const start = new Date(2026, 9, 27)
  const older = new Date(start.getTime() - 1).toISOString()
  const latest = '2026-11-19T10:00:00Z'
  const forPodcast = { podcast_uuid: podcast.uuid }
  const { download } = fakeHistory({
    podcasts: [podcast, idle, undated],
    episodes: [
      episodeRecord({ ...forPodcast, played_up_to: 120, history: { played_up_to: { [start.toISOString()]: 180, [latest]: 60 } } }),
      episodeRecord({ ...forPodcast, history: { played_up_to: { [start.toISOString()]: 90 } } }),
      episodeRecord({ ...forPodcast, history: { played_up_to: { [older]: 600 } } }),
      episodeRecord({ ...forPodcast, played_up_to: 400 }),
      episodeRecord({ ...forPodcast, history: { played_up_to: { '2026-11-25T10:00:00Z': 0 } } }),
      episodeRecord({ podcast_uuid: undated.uuid, played_up_to: 120 }),
      changedAt('2026-10-12T10:00:00Z', { ...forPodcast, history: { played_up_to: { '2026-10-10T10:00:00Z': 360 } } }),
    ],
  })
  const { getPodcastsInWindow, widen } = podcastFeeds({ download })
  await getPodcastsInWindow().episodes

  const catalog = await getPodcastsInWindow().podcasts
  expect(catalog.data.map(({ playTotals }) => playTotals)).toEqual([
    { plays: 4, listenedSeconds: 1270, lastPlayed: latest },
    { plays: 0, listenedSeconds: 0 },
    { plays: 1, listenedSeconds: 120 },
  ])

  await widen()
  const { podcasts: widened } = getPodcastsInWindow()
  expect(widened).toMatchObject({ status: 'fulfilled' })
  expect((await widened).data[0].playTotals).toEqual({ plays: 5, listenedSeconds: 1630, lastPlayed: latest })
})

test('a wider window updates plays while a catalog refresh is still loading', async () => {
  const podcast = podcastRecord()
  const oldPlay = changedAt('2026-10-20T10:00:00Z', {
    podcast_uuid: podcast.uuid,
    history: { played_up_to: { '2026-10-19T10:00:00Z': 600 } },
  })
  const { requests, download, answer } = heldHistory({ podcasts: [podcast], episodes: [oldPlay] })
  const { getEpisodeFeed, getPodcasts, getPodcastsInWindow, widen } = podcastFeeds({ download })
  answer(0)
  await getEpisodeFeed()
  answer(1)
  await getPodcasts.settled()

  vi.setSystemTime(now.getTime() + cacheTtlMs + 1)
  const refreshed = getPodcasts.settled()
  const widened = widen()
  await expect.poll(() => requests.length).toBe(4)
  answer(3)
  await widened

  const { podcasts: catalog } = getPodcastsInWindow()
  expect(catalog).toMatchObject({ status: 'fulfilled' })
  expect((await catalog).data[0]).toMatchObject({ uuid: podcast.uuid, playTotals: { plays: 1, listenedSeconds: 600 } })
  answer(2)
  answer(4)
  await refreshed
  await getEpisodeFeed.settled()
})

test('a wider window replaces the copy shown, ready at once, and the pages showing the feed hear of it', async () => {
  const { getEpisodeFeed, getEpisodes, widen } = podcastFeeds({ download: fakeHistory({ podcasts: [], episodes: monthly() }).download, notices: noticeBoard() })
  await getEpisodes()
  const heard: [string, boolean][] = []
  const unsubscribe = subscribeShownCopies((name, replaced) => heard.push([name, replaced]))

  await widen()
  unsubscribe()

  expect(heard).toEqual([['episodes', true]])
  expect(getEpisodeFeed()).toMatchObject({ status: 'fulfilled', value: { since: new Date(2026, 8, 27) } })
  expect(await getEpisodeFeed.settled()).toBe(await getEpisodeFeed())
  expect(getEpisodes()).toMatchObject({ status: 'fulfilled', value: { since: new Date(2026, 8, 27) } })
  expect((await getEpisodes()).data.map((episode) => episode.title)).toEqual(['2026-11-20', '2026-10-20'])
})

test('a failed widening posts a notice and keeps the window; trying again widens it and clears the notice', async () => {
  const { requests, download } = fakeHistory({ podcasts: [], episodes: monthly() })
  let offline = false
  const notices = noticeBoard()
  const { getEpisodeFeed, widen } = podcastFeeds({ download: (url) => offline ? Promise.reject(new TypeError('Failed to fetch')) : download(url), notices })
  const shown = await getEpisodeFeed()

  offline = true
  await widen()

  expect(notices.get()).toEqual({ 'episodes-widening': { kind: 'warning', text: 'Episodes: couldn’t load 30 more days; the window is unchanged. Failed to fetch' } })
  expect(await getEpisodeFeed()).toBe(shown)

  offline = false
  await widen()

  expect(notices.get()).toEqual({})
  expect((await getEpisodeFeed()).since).toEqual(new Date(2026, 8, 27))
  expect(requests.map(range)).toEqual(['2026-10-27 00:00:00..now', '2026-09-27 00:00:00..2026-10-27 00:00:00'])
})

test('widening twice at once fetches one step', async () => {
  const { requests, download } = fakeHistory({ podcasts: [], episodes: monthly() })
  const { getEpisodeFeed, widen } = podcastFeeds({ download, notices: noticeBoard() })
  await getEpisodeFeed()

  await Promise.all([widen(), widen()])
  await widen()

  expect(requests.map(range)).toEqual([
    '2026-10-27 00:00:00..now',
    '2026-09-27 00:00:00..2026-10-27 00:00:00',
    '2026-08-28 00:00:00..2026-09-27 00:00:00',
  ])
  expect((await getEpisodeFeed()).data.map((episode) => episode.title)).toEqual(['2026-11-20', '2026-10-20', '2026-09-20'])
})

test('a refresh fetches the whole window in one request', async () => {
  const records = { podcasts: [], episodes: monthly() }
  const { requests, download } = fakeHistory(records)
  const { getEpisodeFeed, widen } = podcastFeeds({ download, notices: noticeBoard() })
  await getEpisodeFeed.settled()

  vi.setSystemTime(now.getTime() + cacheTtlMs + 1)
  await widen()
  records.episodes.shift()
  requests.length = 0

  const feed = await getEpisodeFeed.settled()

  expect(requests.map(range)).toEqual(['2026-09-27 00:00:00..now'])
  expect(feed.since).toEqual(new Date(2026, 8, 27))
  expect(feed.data.map((episode) => episode.title)).toEqual(['2026-10-20'])
})

// A fake history API whose answers wait until `answer(n)` lets the nth
// request through (from 0).
function heldHistory(records: { podcasts: object[]; episodes: object[] }) {
  const { requests, download } = fakeHistory(records)
  const held: ((response: Response | undefined) => void)[] = []
  const gates: Promise<Response | undefined>[] = []
  const gate = (n: number) => gates[n] ??= new Promise((resolve) => { held[n] = resolve })
  return {
    requests,
    download: async (url: string) => {
      const n = requests.length
      const response = await download(url)
      return (await gate(n)) ?? response
    },
    answer: (n: number, response?: Response) => { gate(n); held[n](response) },
  }
}

test('a refresh that started before a widening and ends after it keeps the wider window', async () => {
  const replayed = changedAt('2026-10-20T10:00:00Z', { title: 'replayed before' })
  const records = { podcasts: [], episodes: [...monthly(), replayed] }
  const { requests, download, answer } = heldHistory(records)
  const { getEpisodeFeed, widen } = podcastFeeds({ download, notices: noticeBoard() })
  answer(0)
  await getEpisodeFeed.settled()

  records.episodes.push(changedAt('2026-11-26T11:00:00Z', { uuid: replayed.uuid, title: 'replayed since' }))
  vi.setSystemTime(now.getTime() + cacheTtlMs + 1)
  const heard: [string, boolean][] = []
  const unsubscribe = subscribeShownCopies((name, replaced) => heard.push([name, replaced]))
  const refreshed = getEpisodeFeed.settled()
  await expect.poll(() => requests.length).toBe(2) // The refresh, held.
  const widened = widen()
  await expect.poll(() => requests.length).toBe(3)
  answer(2)
  await widened
  const whileRefreshing = getEpisodeFeed()
  const heardWhileRefreshing = [...heard]
  answer(1)

  const feed = await refreshed
  unsubscribe()
  expect(heardWhileRefreshing).toEqual([['episodes', true]])
  expect(whileRefreshing).toMatchObject({ status: 'fulfilled', value: { since: new Date(2026, 8, 27) } })
  expect(heard).toEqual([['episodes', true], ['episodes', true]])
  expect(requests.map(range)).toEqual(['2026-10-27 00:00:00..now', '2026-10-27 00:00:00..now', '2026-09-27 00:00:00..2026-10-27 00:00:00'])
  expect(feed.since).toEqual(new Date(2026, 8, 27))
  expect(feed.data.map((episode) => episode.title)).toEqual(['replayed since', '2026-11-20', '2026-10-20'])
})

test('a widening that started before a refresh and ends after it keeps the refreshed records', async () => {
  const records = { podcasts: [], episodes: monthly() }
  const { requests, download, answer } = heldHistory(records)
  const { getEpisodeFeed, widen } = podcastFeeds({ download, notices: noticeBoard() })
  answer(0)
  await getEpisodeFeed.settled()

  const widened = widen()
  await expect.poll(() => requests.length).toBe(2)
  records.episodes[0] = changedAt('2026-11-26T11:00:00Z', { uuid: records.episodes[0].uuid, title: 'refreshed' })
  vi.setSystemTime(now.getTime() + cacheTtlMs + 1)
  const refreshed = getEpisodeFeed.settled()
  await expect.poll(() => requests.length).toBe(3)
  answer(2)
  await refreshed
  answer(1)
  await widened

  const feed = await getEpisodeFeed()
  expect(feed.since).toEqual(new Date(2026, 8, 27))
  expect(feed.data.map((episode) => episode.title)).toEqual(['refreshed', '2026-10-20'])
})

test('a refresh and widening that finish together publish the wider window with refreshed records', async () => {
  const records = { podcasts: [], episodes: monthly() }
  const { requests, download, answer } = heldHistory(records)
  const { getEpisodeFeed, widen } = podcastFeeds({ download, notices: noticeBoard() })
  answer(0)
  await getEpisodeFeed.settled()

  records.episodes[0] = changedAt('2026-11-26T11:00:00Z', { uuid: records.episodes[0].uuid, title: 'refreshed' })
  vi.setSystemTime(now.getTime() + cacheTtlMs + 1)
  const refreshed = getEpisodeFeed.settled()
  const widened = widen()
  await expect.poll(() => requests.length).toBe(3)
  answer(1)
  answer(2)
  await Promise.all([refreshed, widened])

  const feed = await getEpisodeFeed()
  expect(feed.since).toEqual(new Date(2026, 8, 27))
  expect(feed.data.map((episode) => episode.title)).toEqual(['refreshed', '2026-10-20'])
})

test('a failed refresh keeps the widened copy visible and the next request retries it', async () => {
  const { requests, download, answer } = heldHistory({ podcasts: [], episodes: monthly() })
  const notices = noticeBoard()
  const { getEpisodeFeed, widen } = podcastFeeds({ download, notices })
  answer(0)
  await getEpisodeFeed.settled()

  vi.setSystemTime(now.getTime() + cacheTtlMs + 1)
  const refreshed = getEpisodeFeed.settled()
  const widened = widen()
  await expect.poll(() => requests.length).toBe(3)
  answer(2)
  await widened
  answer(1, new Response('', { status: 503 }))
  const shown = await refreshed

  expect(shown.since).toEqual(new Date(2026, 8, 27))
  expect(notices.get().episodes?.text).toContain('refresh failed')
  const current = getEpisodeFeed()
  expect(current).toMatchObject({ status: 'fulfilled', value: shown })
  answer(3)
  expect((await getEpisodeFeed.settled()).since).toEqual(shown.since)
  expect(requests.map(range).at(-1)).toBe('2026-09-27 00:00:00..now')
  expect(notices.get()).toEqual({})
})

test('a successful refresh leaves a failed widening notice until widening succeeds', async () => {
  const { requests, download, answer } = heldHistory({ podcasts: [], episodes: monthly() })
  const notices = noticeBoard()
  const { getEpisodeFeed, widen } = podcastFeeds({ download, notices })
  answer(0)
  await getEpisodeFeed.settled()

  vi.setSystemTime(now.getTime() + cacheTtlMs + 1)
  const refreshed = getEpisodeFeed.settled()
  const widened = widen()
  await expect.poll(() => requests.length).toBe(3)
  answer(2, new Response('', { status: 503 }))
  await widened
  const warning = notices.get()['episodes-widening']
  expect(warning?.text).toContain('the window is unchanged')

  answer(1)
  expect((await refreshed).since).toEqual(new Date(2026, 9, 27))
  expect(notices.get()['episodes-widening']).toBe(warning)
  answer(3)
  await widen()
  expect((await getEpisodeFeed()).since).toEqual(new Date(2026, 8, 27))
  expect(notices.get()).toEqual({})
})
