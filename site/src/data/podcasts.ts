import type { z } from 'zod'
import { historyUrl, recentDays, user } from '../config'
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

export interface Episode {
  uuid: string
  title: string
  podcastId: string
  podcastTitle: string
  duration: number
  playedSeconds: number
  firstPlayed: string
  lastPlayed: string
}

function toEpisode(episode: EpisodeRecord, podcastTitle = ''): Episode {
  let playedSeconds = episode.played_up_to ?? 0
  const playbackDates = []
  for (const [date, seconds] of Object.entries(episode.history.played_up_to ?? {})) {
    if (seconds > 0) {
      playedSeconds = Math.max(playedSeconds, seconds)
      playbackDates.push(date)
    }
  }
  playbackDates.sort()
  return {
    uuid: episode.uuid,
    title: episode.title,
    podcastId: episode.podcast_uuid,
    podcastTitle,
    duration: Number(episode.duration ?? 0),
    playedSeconds,
    firstPlayed: playbackDates[0] ?? '',
    lastPlayed: episode.meta.__lastPlayed ?? playbackDates.at(-1) ?? '',
  }
}

// The podcast and episode feeds, and lookups of one podcast or episode by
// `uuid`, all from the history API. A lookup is not a feed: it has no feed
// time. Only the podcast feed has a saved copy: the episode feed's URL changes
// with every load, and it's small.
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

  // The episode feed alone, without podcast titles: it doesn't wait for the
  // podcast feed.
  const getEpisodeFeed = shareFeed(() => {
    const since = new Date(Date.now() - recentDays * 24 * 60 * 60 * 1000).toISOString()
    return mapData(feed('episode', { user, since }), (episodes) => episodes.map((episode) => toEpisode(episode)))
  })

  // The episode feed with titles from the podcast feed shown now: worked out
  // again on each call, so a fresh podcast feed brings fresh titles. Ready at
  // once if this tab has both feeds.
  function getEpisodes(): Promise<Feed<Episode[]>> {
    const episodes = getEpisodeFeed.loaded()
    const podcasts = getPodcasts.loaded()
    if (episodes && podcasts) return ready(withTitles(episodes, podcasts.data))
    return Promise.all([
      getEpisodeFeed(),
      getPodcasts().then((podcasts) => podcasts.data, () => []),
    ]).then(([episodes, podcasts]) => withTitles(episodes, podcasts))
  }

  function withTitles(episodes: Feed<Episode[]>, podcasts: Podcast[]) {
    const titles = new Map(podcasts.map((podcast) => [podcast.uuid, podcast.title]))
    return { ...episodes, data: episodes.data.map((episode) => ({ ...episode, podcastTitle: titles.get(episode.podcastId) ?? '' })) }
  }

  async function getEpisode(uuid: string) {
    // A detail URL can point to an episode outside the recent listing.
    const episode = await lookup('episode', uuid)
    if (!episode) return undefined
    const podcast = await getPodcast(episode.podcast_uuid).catch(() => undefined)
    return toEpisode(episode, podcast?.title)
  }

  return { getPodcasts, getPodcast, getEpisodeFeed, getEpisodes, getEpisode }
}

export const { getPodcasts, getPodcast, getEpisodeFeed, getEpisodes, getEpisode } = podcastFeeds()
