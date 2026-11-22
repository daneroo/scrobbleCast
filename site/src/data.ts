import { booksUrl, cacheTtlMs, historyUrl, recentDays, user } from './config'

export interface Book {
  bookId: string
  title: string
  authorName: string
  bookDescription: string
  bookImageURL: string
  bookURL: string
  userShelf: string
  userLastReadAt: string
}

interface PodcastRecord {
  uuid: string
  title: string
  author?: string
  description?: string
  thumbnail_url?: string
  meta?: { __firstSeen?: string }
}

interface EpisodeRecord {
  uuid: string
  title: string
  podcast_uuid: string
  podcast_title?: string
  duration: number
  played_up_to?: number
  firstPlayed?: string
  lastPlayed?: string
  meta?: { __lastPlayed?: string }
  history?: { played_up_to?: Record<string, number> }
}

function plainText(html: string) {
  if (!html) return ''
  const template = document.createElement('template')
  template.innerHTML = html.replace(/<br\s*\/?>|<\/(?:p|div)>/gi, '\n')
  return template.content.textContent?.trim() ?? ''
}

async function fetchList<T>(url: string, label: string): Promise<T[]> {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Could not load ${label} (HTTP ${response.status}).`)
  const data: unknown = await response.json()
  if (!Array.isArray(data)) throw new Error(`Unexpected response for ${label}.`)
  return data
}

function history<T>(params: Record<string, string>) {
  const url = new URL(historyUrl)
  url.search = new URLSearchParams(params).toString()
  return fetchList<T>(url.href, params.type + ' data')
}

// Share in-flight and recent requests across routes in the current tab.
function cached<T>(load: () => Promise<T>, ttl = cacheTtlMs) {
  let entry: { expires: number; promise: Promise<T> } | undefined
  return () => {
    if (entry && entry.expires > Date.now()) return entry.promise
    const promise = load().catch((error) => {
      if (entry?.promise === promise) entry = undefined
      throw error
    })
    entry = { expires: Date.now() + ttl, promise }
    return promise
  }
}

export const getBooks = cached(async () => {
  const books = await fetchList<Book>(booksUrl, 'books')
  return books.map((book) => ({
    bookId: book.bookId,
    title: book.title,
    authorName: book.authorName,
    bookDescription: plainText(book.bookDescription),
    bookImageURL: book.bookImageURL,
    bookURL: book.bookURL,
    userShelf: book.userShelf,
    userLastReadAt: book.userLastReadAt,
  }))
})

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
    description: plainText(podcast.description ?? ''),
    thumbnail: podcast.thumbnail_url ?? '',
    firstSeen: podcast.meta?.__firstSeen ?? '',
  }
}

export const getPodcasts = cached(async () => {
  const podcasts = await history<PodcastRecord>({ type: 'podcast', user })
  return podcasts.map(toPodcast)
})

export async function getPodcast(uuid: string) {
  const podcasts = await getPodcasts()
  const known = podcasts.find((podcast) => podcast.uuid === uuid)
  if (known) return known
  const [podcast] = await history<PodcastRecord>({ type: 'podcast', uuid })
  return podcast ? toPodcast(podcast) : undefined
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

function toEpisode(episode: EpisodeRecord, podcastTitle?: string): Episode {
  let playedSeconds = Number(episode.played_up_to) || 0
  const playbackDates = []
  for (const [date, seconds] of Object.entries(episode.history?.played_up_to ?? {})) {
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
    podcastTitle: podcastTitle || episode.podcast_title || '',
    duration: Number(episode.duration) || 0,
    playedSeconds,
    firstPlayed: episode.firstPlayed || playbackDates[0] || '',
    lastPlayed: episode.lastPlayed || episode.meta?.__lastPlayed || playbackDates.at(-1) || '',
  }
}

export const getEpisodes = cached(async () => {
  const since = new Date(Date.now() - recentDays * 24 * 60 * 60 * 1000).toISOString()
  const [episodes, podcasts] = await Promise.all([
    history<EpisodeRecord>({ type: 'episode', user, since }),
    getPodcasts().catch(() => []),
  ])
  const titles = new Map(podcasts.map((podcast) => [podcast.uuid, podcast.title]))
  return episodes.map((episode) => toEpisode(episode, titles.get(episode.podcast_uuid)))
})

export async function getEpisode(uuid: string) {
  // A detail URL can point to an episode outside the recent listing.
  const [episode] = await history<EpisodeRecord>({ type: 'episode', uuid })
  if (!episode) return undefined
  const podcast = await getPodcast(episode.podcast_uuid).catch(() => undefined)
  return toEpisode(episode, podcast?.title)
}
