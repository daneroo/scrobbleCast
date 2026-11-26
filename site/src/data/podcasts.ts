import type { z } from 'zod'
import { historyUrl, user, windowDays, windowStepDays } from '../config'
import { notices as appNotices } from '../notices'
import { EpisodeRecords, PodcastRecords, type EpisodeRecord, type PodcastRecord } from '../schema/podcast'
import { loadFeed, loadJson, mapData, plainText, ready, shareFeed, type Feed, type FeedOptions, type FeedTime } from './fetch'

// What the history API returns for each type.
interface Records {
  podcast: PodcastRecord[]
  episode: EpisodeRecord[]
}
const recordSchemas: { [K in keyof Records]: z.ZodType<Records[K]> } = {
  podcast: PodcastRecords,
  episode: EpisodeRecords,
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
  url?: string
  added?: string
  plays?: number
  listened?: number
  lastPlayed?: string
}

function toPodcast(podcast: PodcastRecord): Podcast {
  return {
    uuid: podcast.uuid,
    title: podcast.title,
    author: podcast.author ?? '',
    description: plainText(podcast.description),
    thumbnail: podcast.thumbnail_url ?? '',
    firstSeen: podcast.meta.__firstSeen,
    url: podcast.url ?? undefined,
    added: isoTime(podcast.dateAdded) || undefined,
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

// A recent change to a record can be unrelated to playback.
function playedSince(episode: Episode, start: number) {
  return episode.playedSeconds > 0 && Date.parse(episode.lastPlayed) >= start
}

export function countPlayedSince({ data, since }: EpisodeFeed) {
  const start = since.getTime()
  return data.filter((episode) => playedSince(episode, start)).length
}

// Count each played episode once, using its furthest played position.
function playsByPodcast({ data, since }: EpisodeFeed) {
  const start = since.getTime()
  const byId = new Map<string, { plays: number; listened: number; lastPlayed: string }>()
  for (const episode of data) {
    if (!playedSince(episode, start)) continue
    const totals = byId.get(episode.podcastId)
    if (!totals) {
      byId.set(episode.podcastId, { plays: 1, listened: episode.playedSeconds, lastPlayed: episode.lastPlayed })
      continue
    }
    totals.plays += 1
    totals.listened += episode.playedSeconds
    if (Date.parse(episode.lastPlayed) > Date.parse(totals.lastPlayed)) totals.lastPlayed = episode.lastPlayed
  }
  return byId
}

function lastUpdate(record: EpisodeRecord) {
  return Date.parse(record.meta.__lastUpdated)
}

// Episode records merged by uuid, the one with the newer last update kept
// (`incoming` on a tie), newest first as the history API gives them.
function mergeRecords(kept: EpisodeRecord[], incoming: EpisodeRecord[]) {
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
  start.setDate(start.getDate() - days)
  start.setHours(0, 0, 0, 0)
  return start
}

// The podcast and episode feeds, and lookups of one podcast or episode by
// `uuid`, all from the history API. A lookup is not a feed: it has no feed
// time. Only the podcast feed has a saved copy. The episode feed's Window
// lasts for the tab.
export function podcastFeeds(options: FeedOptions = {}) {
  const notices = options.notices ?? appNotices
  const wideningNotice = 'episodes-widening'

  function historyUrlFor(type: keyof Records, params: Record<string, string>) {
    const url = new URL(historyUrl)
    url.search = new URLSearchParams({ type, ...params }).toString()
    return url.href
  }

  async function lookup<K extends keyof Records>(type: K, uuid: string): Promise<Records[K][number] | undefined> {
    const { data } = await loadJson(historyUrlFor(type, { uuid }), `${type} records`, recordSchemas[type], options.download)
    return data.at(0)
  }

  const getPodcasts = shareFeed(() => mapData(loadFeed({
    name: 'podcasts',
    url: historyUrlFor('podcast', { user }),
    schema: PodcastRecords,
    time: lastChange,
    save: true,
  }, options), (podcasts) => podcasts.map(toPodcast)), { refreshInBackground: true })

  // Use the podcast feed if this tab already has it; never download it whole.
  function getPodcast(uuid: string): Promise<Podcast | undefined> {
    const known = getPodcasts.loaded()?.data.find((podcast) => podcast.uuid === uuid)
    if (known) return ready(known)
    return lookup('podcast', uuid).then((podcast) => podcast && toPodcast(podcast))
  }

  // The episode feed's records over `[since, before)`, or `[since, now)`.
  async function episodeRange(since: Date, before?: Date) {
    const params = { user, since: since.toISOString(), ...(before && { before: before.toISOString() }) }
    const { data } = await loadJson(historyUrlFor('episode', params), 'episodes', EpisodeRecords, options.download)
    return data
  }

  // The Window's records, and since when: it lasts for the tab.
  let kept: { since: Date; records: EpisodeRecord[] } | undefined

  function keep(since: Date, records: EpisodeRecord[]): EpisodeFeed {
    kept = { since, records }
    return { name: 'episodes', data: records.map((episode) => toEpisode(episode)), time: lastChange(records), source: 'fresh', since }
  }

  // The episode feed alone, without its podcasts' titles and artwork: it
  // doesn't wait for the podcast feed. Each load fetches the whole Window.
  const getEpisodeFeed = shareFeed(async function* () {
    const since = kept?.since ?? daysBefore(new Date(), windowDays)
    try {
      const records = await episodeRange(since)
      notices.clear('episodes')
      yield () => {
        // Replace the part refreshed and keep any older range added meanwhile.
        const older = kept?.records.filter((record) => lastUpdate(record) < since.getTime()) ?? []
        return keep(kept?.since ?? since, mergeRecords(older, records))
      }
    } catch (error) {
      if (kept) notices.post('episodes', { kind: 'warning', text: 'Episodes: refresh failed, showing the current window.' })
      throw error
    }
  }, { refreshInBackground: true })

  // The catalog can be shown before the episode feed has a copy. Use the copy
  // shown when the catalog becomes available, including after a widening.
  function getPodcastsWithPlays(): Promise<Feed<Podcast[]>> {
    const catalog = getPodcasts()
    const shown = getPodcasts.loaded()
    return shown ? ready(withCurrentPlays(shown)) : catalog.then(withCurrentPlays)
  }

  function withCurrentPlays(catalog: Feed<Podcast[]>): Feed<Podcast[]> {
    const episodes = getEpisodeFeed.loaded()
    if (!episodes) return catalog
    const byId = playsByPodcast(episodes)
    return {
      ...catalog,
      data: catalog.data.map((podcast) => ({ ...podcast, ...(byId.get(podcast.uuid) ?? { plays: 0, listened: 0 }) })),
    }
  }

  // Widen the Window a step further back: fetch the range before it, merge
  // it in, and show the new copy, so every page showing the feed follows. A
  // failure posts a notice and keeps the Window. A widening under way is
  // joined, not repeated. It never raises.
  let widening: Promise<void> | undefined
  function widen() {
    widening ??= (async () => {
      try {
        const { since } = kept ?? await getEpisodeFeed()
        const from = daysBefore(since, windowStepDays)
        const records = await episodeRange(from, since)
        getEpisodeFeed.show(keep(from, mergeRecords(kept?.records ?? [], records)))
        notices.clear(wideningNotice)
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error)
        notices.post(wideningNotice, { kind: 'warning', text: `Episodes: couldn’t load ${windowStepDays} more days; the window is unchanged. ${reason}` })
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

  return { getPodcasts, getPodcastsWithPlays, getPodcast, getEpisodeFeed, getEpisodes, getEpisode, widen: Object.assign(widen, { pending: () => widening }) }
}

export const { getPodcasts, getPodcastsWithPlays, getPodcast, getEpisodeFeed, getEpisodes, getEpisode, widen } = podcastFeeds()
