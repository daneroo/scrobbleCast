import type { z } from 'zod'
import { historyUrl, user, windowDays, windowStepDays } from '../config'
import { notices as appNotices } from '../notices'
import { EpisodeRecords, PodcastRecords, type EpisodeRecord, type PodcastRecord } from '../schema/podcast'
import { loadFeed, loadJson, mapData, plainText, ready, shareFeed, type Feed, type FeedName, type FeedOptions, type FeedTime } from './fetch'

// What the history API returns for each type, and the feed of that type.
interface Records {
  podcast: PodcastRecord[]
  episode: EpisodeRecord[]
}
const recordTypes: { [K in keyof Records]: { feedName: FeedName; schema: z.ZodType<Records[K]> } } = {
  podcast: { feedName: 'podcasts', schema: PodcastRecords },
  episode: { feedName: 'episodes', schema: EpisodeRecords },
}

// The history API doesn't say when it last ran; a feed's last change is the
// newest change the scraper saw across its records.
function lastChange(records: { meta: { __lastUpdated: string } }[]): FeedTime {
  let newest: string | undefined
  for (const { meta } of records) {
    if (!newest || Date.parse(meta.__lastUpdated) > Date.parse(newest)) newest = meta.__lastUpdated
  }
  return { label: 'last change', at: newest ? new Date(newest) : undefined }
}

export interface Podcast {
  uuid: string
  title: string
  author: string
  description: string
  thumbnail: string
  firstSeen: string
}

function toPodcast(podcast: PodcastRecord): Podcast {
  return {
    uuid: podcast.uuid,
    title: podcast.title,
    author: podcast.author ?? '',
    description: plainText(podcast.description),
    thumbnail: podcast.thumbnail_url ?? '',
    firstSeen: podcast.meta.__firstSeen,
  }
}

// Where I am with an episode, as Pocket Casts records it (glossary: Status).
export const statuses = ['unplayed', 'in-progress', 'finished'] as const
export type Status = (typeof statuses)[number]

const statusOf: Record<number, Status> = { 0: 'unplayed', 1: 'unplayed', 2: 'in-progress', 3: 'finished' }

export interface Episode {
  uuid: string
  title: string
  // Its podcast's, from the podcast feed shown now; empty until it loads, or
  // when the feed doesn't have it.
  podcastId: string
  podcastTitle: string
  artwork: string
  // The audio.
  url: string
  // ISO 8601; empty when unknown.
  published: string
  // Seconds; 0 when unknown.
  duration: number
  playedSeconds: number
  // The furthest played, as a percentage of the duration; none without one.
  progress?: number
  // None when the record doesn't say.
  status?: Status
  firstPlayed: string
  lastPlayed: string
}

// What an episode carries of its podcast, when the podcast feed has it.
function ofPodcast(podcast: Podcast | undefined) {
  return { podcastTitle: podcast?.title ?? '', artwork: podcast?.thumbnail ?? '' }
}

// ISO 8601: older records give "2018-12-12 16:17:39", taken as UTC.
function isoTime(text: string | undefined) {
  if (!text) return ''
  return /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(text) ? text.replace(' ', 'T') + 'Z' : text
}

function toEpisode(episode: EpisodeRecord, podcast?: Podcast): Episode {
  let playedSeconds = episode.played_up_to ?? 0
  const playbackDates = []
  for (const [date, seconds] of Object.entries(episode.history.played_up_to ?? {})) {
    if (seconds > 0) {
      playedSeconds = Math.max(playedSeconds, seconds)
      playbackDates.push(date)
    }
  }
  playbackDates.sort()
  const duration = Number(episode.duration ?? 0)
  return {
    uuid: episode.uuid,
    title: episode.title,
    podcastId: episode.podcast_uuid,
    ...ofPodcast(podcast),
    url: episode.url ?? '',
    published: isoTime(episode.published_at),
    duration,
    playedSeconds,
    progress: duration ? 100 * playedSeconds / duration : undefined,
    status: episode.playing_status === undefined ? undefined : statusOf[episode.playing_status],
    firstPlayed: playbackDates[0] ?? '',
    lastPlayed: episode.meta.__lastPlayed ?? playbackDates.at(-1) ?? '',
  }
}

// A copy of the episode feed: its episodes, and since when they changed, its
// Window (glossary). It reaches from `since` to now.
export interface EpisodeFeed extends Feed<Episode[]> {
  since: Date
}

// Episode records merged by uuid, the one with the newer last update kept
// (`incoming` on a tie), newest first as the history API gives them.
function mergeRecords(kept: EpisodeRecord[], incoming: EpisodeRecord[]) {
  const lastUpdate = (record: EpisodeRecord) => Date.parse(record.meta.__lastUpdated)
  const byId = new Map(kept.map((record) => [record.uuid, record]))
  for (const record of incoming) {
    const known = byId.get(record.uuid)
    if (!known || lastUpdate(record) >= lastUpdate(known)) byId.set(record.uuid, record)
  }
  return [...byId.values()].sort((a, b) => lastUpdate(b) - lastUpdate(a))
}

// The start of the local day `days` before `day`.
function daysBefore(day: Date, days: number) {
  const start = new Date(day)
  start.setHours(0, 0, 0, 0)
  start.setDate(start.getDate() - days)
  return start
}

// The podcast and episode feeds, and lookups of one podcast or episode by
// `uuid`, all from the history API. A lookup is not a feed: it has no feed
// time. Only the podcast feed has a saved copy: the episode feed's URL changes
// with every load, and its Window lasts for the tab.
export function podcastFeeds(options: FeedOptions = {}) {
  function historyUrlFor(type: keyof Records, params: Record<string, string>) {
    const url = new URL(historyUrl)
    url.search = new URLSearchParams({ type, ...params }).toString()
    return url.href
  }

  function feed<K extends keyof Records>(type: K, params: Record<string, string>) {
    const { feedName: name, schema } = recordTypes[type]
    return loadFeed({ name, url: historyUrlFor(type, params), schema, time: lastChange, save: type === 'podcast' }, options)
  }

  async function lookup<K extends keyof Records>(type: K, uuid: string): Promise<Records[K][number] | undefined> {
    const { schema } = recordTypes[type]
    const { data } = await loadJson(historyUrlFor(type, { uuid }), `${type} records`, schema, options.download)
    return data.at(0)
  }

  const getPodcasts = shareFeed(() => mapData(feed('podcast', { user }), (podcasts) => podcasts.map(toPodcast)))

  // Use the podcast feed if this tab already has it; never download it whole.
  function getPodcast(uuid: string): Promise<Podcast | undefined> {
    const known = getPodcasts.loaded()?.data.find((podcast) => podcast.uuid === uuid)
    if (known) return ready(known)
    return lookup('podcast', uuid).then((podcast) => podcast && toPodcast(podcast))
  }

  // The episode feed's records over `[since, before)`, or `[since, now)`.
  async function episodeRange(since: Date, before?: Date) {
    const params = { user, since: since.toISOString(), ...(before && { before: before.toISOString() }) }
    // A feed with no saved copy gives its fresh copy, or raises.
    for await (const copy of feed('episode', params)) return copy.data
    throw new Error('The episode feed gave no copy.')
  }

  // The Window's records, and since when: it lasts for the tab.
  let kept: { since: Date; records: EpisodeRecord[] } | undefined

  // Records fetched since `since`, merged into the Window kept: a copy of the
  // new Window. Merging, not replacing, lets a load and a widening overlap
  // in either order.
  function keep(since: Date, records: EpisodeRecord[]): EpisodeFeed {
    if (kept) {
      records = mergeRecords(kept.records, records)
      if (kept.since < since) since = kept.since
    }
    kept = { since, records }
    return { name: 'episodes', data: records.map((episode) => toEpisode(episode)), time: lastChange(records), source: 'fresh', since }
  }

  // The episode feed alone, without its podcasts' titles and artwork: it
  // doesn't wait for the podcast feed. Each load fetches the whole Window.
  const getEpisodeFeed = shareFeed(async function* () {
    const since = kept?.since ?? daysBefore(new Date(), windowDays)
    yield keep(since, await episodeRange(since))
  })

  // Widen the Window a step further back: fetch the range before it, merge
  // it in, and show the new copy, so every page showing the feed follows. A
  // failure posts a notice and keeps the Window. A widening under way is
  // joined, not repeated. It never raises.
  const notices = options.notices ?? appNotices
  let widening: Promise<void> | undefined
  function widen() {
    widening ??= (async () => {
      try {
        const { since } = kept ?? await getEpisodeFeed()
        const from = daysBefore(since, windowStepDays)
        getEpisodeFeed.show(keep(from, await episodeRange(from, since)))
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error)
        notices.post('episodes', { kind: 'warning', text: `Episodes: couldn’t load ${windowStepDays} more days; the window is unchanged. ${reason}` })
      } finally {
        widening = undefined
      }
    })()
    return widening
  }

  // The episode feed joined to the podcast feed shown now (each episode's
  // podcast title and artwork): worked out again on each call, so a fresh
  // podcast feed brings fresh titles. Ready at once if this tab has both
  // feeds.
  function getEpisodes(): Promise<EpisodeFeed> {
    // Ask both feeds first: that starts a load, or retries a failed refresh.
    const episodeFeed = getEpisodeFeed()
    const podcastFeed = getPodcasts().then((podcasts) => podcasts.data, () => [])
    const episodes = getEpisodeFeed.loaded()
    const podcasts = getPodcasts.loaded()
    if (episodes && podcasts) return ready(withPodcasts(episodes, podcasts.data))
    return Promise.all([episodeFeed, podcastFeed]).then(([episodes, podcasts]) => withPodcasts(episodes, podcasts))
  }

  function withPodcasts(episodes: EpisodeFeed, podcasts: Podcast[]): EpisodeFeed {
    const byId = new Map(podcasts.map((podcast) => [podcast.uuid, podcast]))
    return { ...episodes, data: episodes.data.map((episode) => ({ ...episode, ...ofPodcast(byId.get(episode.podcastId)) })) }
  }

  async function getEpisode(uuid: string) {
    // A detail URL can point to an episode outside the recent listing.
    const episode = await lookup('episode', uuid)
    if (!episode) return undefined
    const podcast = await getPodcast(episode.podcast_uuid).catch(() => undefined)
    return toEpisode(episode, podcast)
  }

  return { getPodcasts, getPodcast, getEpisodeFeed, getEpisodes, getEpisode, widen: Object.assign(widen, { pending: () => widening }) }
}

export const { getPodcasts, getPodcast, getEpisodeFeed, getEpisodes, getEpisode, widen } = podcastFeeds()
