import type { z } from 'zod'
import { historyUrl, recentDays, user } from '../config'
import { EpisodeRecords, PodcastRecords, type EpisodeRecord, type PodcastRecord } from '../schema/podcast'
import { cached, loadFeed, plainText, type Download } from './fetch'

// What the history API returns for each type, and how errors name it.
interface Records {
  podcast: PodcastRecord[]
  episode: EpisodeRecord[]
}
const recordTypes: { [K in keyof Records]: { label: string; schema: z.ZodType<Records[K]> } } = {
  podcast: { label: 'podcasts', schema: PodcastRecords },
  episode: { label: 'episodes', schema: EpisodeRecords },
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

// The podcast and episode feeds, and lookups of one podcast or episode, all
// from the history API through `download`.
export function podcastFeeds(download?: Download) {
  function history<K extends keyof Records>(type: K, params: Record<string, string>) {
    const { label, schema } = recordTypes[type]
    const url = new URL(historyUrl)
    url.search = new URLSearchParams({ type, ...params }).toString()
    return loadFeed(url.href, label, schema, download)
  }

  const getPodcasts = cached(async () => {
    const podcasts = await history('podcast', { user })
    return podcasts.map(toPodcast)
  })

  // Use the podcast feed if this tab already has it; never download it whole.
  async function getPodcast(uuid: string) {
    const known = getPodcasts.loaded()?.find((podcast) => podcast.uuid === uuid)
    if (known) return known
    const [podcast] = await history('podcast', { uuid })
    return podcast ? toPodcast(podcast) : undefined
  }

  const getEpisodes = cached(async () => {
    const since = new Date(Date.now() - recentDays * 24 * 60 * 60 * 1000).toISOString()
    const [episodes, podcasts] = await Promise.all([
      history('episode', { user, since }),
      getPodcasts().catch(() => []),
    ])
    const titles = new Map(podcasts.map((podcast) => [podcast.uuid, podcast.title]))
    return episodes.map((episode) => toEpisode(episode, titles.get(episode.podcast_uuid)))
  })

  async function getEpisode(uuid: string) {
    // A detail URL can point to an episode outside the recent listing.
    const [episode] = await history('episode', { uuid })
    if (!episode) return undefined
    const podcast = await getPodcast(episode.podcast_uuid).catch(() => undefined)
    return toEpisode(episode, podcast?.title)
  }

  return { getPodcasts, getPodcast, getEpisodes, getEpisode }
}

export const { getPodcasts, getPodcast, getEpisodes, getEpisode } = podcastFeeds()
