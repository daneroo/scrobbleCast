import type { z } from 'zod'
import { historyUrl, recentDays, user } from '../config'
import { EpisodeRecords, PodcastRecords, type EpisodeRecord, type PodcastRecord } from '../schema/podcast'
import { cached, loadFeed, loadJson, plainText, type Download, type FeedName, type FeedTime } from './fetch'

// What the history API returns for each type, and the feed of that type.
interface Records {
  podcast: PodcastRecord[]
  episode: EpisodeRecord[]
}
const recordTypes: { [K in keyof Records]: { feed: FeedName; schema: z.ZodType<Records[K]> } } = {
  podcast: { feed: 'podcasts', schema: PodcastRecords },
  episode: { feed: 'episodes', schema: EpisodeRecords },
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
// `uuid`, all from the history API through `download`. A lookup is not a
// feed: it has no feed time.
export function podcastFeeds(download?: Download) {
  function historyUrlFor(type: keyof Records, params: Record<string, string>) {
    const url = new URL(historyUrl)
    url.search = new URLSearchParams({ type, ...params }).toString()
    return url.href
  }

  function feed<K extends keyof Records>(type: K, params: Record<string, string>) {
    const { feed: name, schema } = recordTypes[type]
    return loadFeed({ name, url: historyUrlFor(type, params), schema, time: lastChange }, download)
  }

  async function lookup<K extends keyof Records>(type: K, uuid: string): Promise<Records[K][number] | undefined> {
    const { feed: label, schema } = recordTypes[type]
    const { data } = await loadJson(historyUrlFor(type, { uuid }), label, schema, download)
    return data.at(0)
  }

  const getPodcasts = cached(async () => {
    const podcasts = await feed('podcast', { user })
    return { ...podcasts, data: podcasts.data.map(toPodcast) }
  })

  // Use the podcast feed if this tab already has it; never download it whole.
  async function getPodcast(uuid: string) {
    const known = getPodcasts.loaded()?.data.find((podcast) => podcast.uuid === uuid)
    if (known) return known
    const podcast = await lookup('podcast', uuid)
    return podcast ? toPodcast(podcast) : undefined
  }

  const getEpisodes = cached(async () => {
    const since = new Date(Date.now() - recentDays * 24 * 60 * 60 * 1000).toISOString()
    const [episodes, podcasts] = await Promise.all([
      feed('episode', { user, since }),
      getPodcasts().then((podcasts) => podcasts.data, () => []),
    ])
    const titles = new Map(podcasts.map((podcast) => [podcast.uuid, podcast.title]))
    return { ...episodes, data: episodes.data.map((episode) => toEpisode(episode, titles.get(episode.podcast_uuid))) }
  })

  async function getEpisode(uuid: string) {
    // A detail URL can point to an episode outside the recent listing.
    const episode = await lookup('episode', uuid)
    if (!episode) return undefined
    const podcast = await getPodcast(episode.podcast_uuid).catch(() => undefined)
    return toEpisode(episode, podcast?.title)
  }

  return { getPodcasts, getPodcast, getEpisodes, getEpisode }
}

export const { getPodcasts, getPodcast, getEpisodes, getEpisode } = podcastFeeds()
