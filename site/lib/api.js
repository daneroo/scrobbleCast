import { promises as fs } from 'fs'
import { join } from 'path'
import { daysAgo } from './date'
const dataDirectory = join(process.cwd(), 'data')
// const historyFile = join(dataDirectory, 'history-daniel.json')

const baseURL = 'https://scrobblecast.dl.imetrical.com/api'

async function fetcher (path, qs = { }) {
  const qss = new URLSearchParams(qs).toString()
  const url = `${baseURL}/${path}?${qss}`
  // eslint-disable-next-line no-undef
  const results = await fetch(url)
  const object = await results.json()
  console.info('fetched', url)
  return object
}

console.log('=-=-=-=-=-= New Cache/New Lambda? =-=-=-=-=-=')
const cache = {
  apiSignature: null,
  episodes: {},
  episodesByUUID: {},
  podcasts: [],
  podcastsByUUID: {},
  booksFeed: null,
  bookById: {}
}

export async function getApiSignature () {
  if (cache.apiSignature) {
    return cache.apiSignature
  }
  const versions = await fetcher('version')
  const generatedAt = new Date().toISOString()
  const apiSignature = {
    versions,
    generatedAt
  }
  cache.apiSignature = apiSignature
  return apiSignature
}

// - try the cache, then fetch else return {}
async function getByUUID ({ uuid, type }) {
  if (cache[type][uuid]) {
    return cache[type][uuid]
  }
  const items = await fetcher('history', { uuid, type })
  const item = items?.[0] ?? {}
  return item
}

export async function getEpisode (uuid) {
  await getEpisodes() // warm up the cache
  const episode = await getByUUID({ uuid, type: 'episodesByUUID' })
  return playDecorate(episode)
}

export async function getPodcast (uuid) {
  await getPodcasts() // warm up the cache
  return getByUUID({ uuid, type: 'podcastsByUUID' })
}

const defaultDays = 45
export async function getEpisodes (days = defaultDays) {
  if (cache.episodes.length > 0) {
    const { episodes } = cache
    // console.log('|Episodes (hit)|', episodes.length)
    return episodes
  }

  const since = daysAgo(days)
  const episodes = await fetcher('history', { type: 'episode', user: 'daniel', since })
  cache.episodes = episodes
  for (const e of episodes) {
    cache.episodesByUUID[e.uuid] = e
  }
  console.log('|Episodes (miss)|', episodes.length)
  console.log('|Episodes (miss/uuid)|', Object.keys(cache.episodesByUUID).length)
  return episodes
}

export async function getPodcasts () {
  if (cache.podcasts.length > 0) {
    const { podcasts } = cache
    // console.log('|Podcast (hit)|', podcasts.length)
    return podcasts
  }

  const podcasts = await fetcher('history', { type: 'podcast', user: 'daniel' })
  cache.podcasts = podcasts
  for (const p of podcasts) {
    cache.podcastsByUUID[p.uuid] = p
  }
  console.log('|Podcasts (miss)|', podcasts.length)
  console.log('|Podcasts (miss/uuid)|', Object.keys(cache.podcastsByUUID).length)
  return podcasts
}

// https://raw.githubusercontent.com/daneroo/scrobble-books-data/main/goodreads-rss.json
export async function getBooksFeed () {
  if (cache.booksFeed) {
    const { booksFeed } = cache
    // console.log('|Books (hit)|', booksFeed.items.length)
    return booksFeed
  }

  // Get books data from latest `scrobble-books-data` Github Actions run
  const url = 'https://raw.githubusercontent.com/daneroo/scrobble-books-data/main/goodreads-rss.json'
  console.log(`fetching url: ${url}`)
  // eslint-disable-next-line no-undef
  const results = await fetch(url)
  const booksFeed = await results.json()

  // Move this upstream to scroble-books-data
  booksFeed.items = booksFeed.items.map(b => ({ ...b, userShelves: b?.userShelves || 'read' }))

  cache.booksFeed = booksFeed
  for (const b of booksFeed.items) {
    cache.bookById[b.bookId] = b
  }
  console.log('|Books (miss)|', booksFeed.items.length)
  console.log('|Books (miss/uuid)|', Object.keys(cache.bookById).length)
  return booksFeed
}
export async function getBook (bookId) {
  await getBooksFeed() // // warm up the cache
  return cache.bookById[bookId]
}

// add podcast object to episodes
export async function getDecoratedEpisodes (days) {
  // first add podcast
  const podcastsByUUID = byUUID(await getPodcasts())
  const episodes = await getEpisodes(days)
  const decorated = episodes.map((episode) => {
    return {
      ...playDecorate(episode),
      podcast: podcastsByUUID[episode.podcast_uuid]
    }
  })
  return decorated
}

// playCount playedTime firstPlayed lastPlayed playedProportion
export function playDecorate (episode) {
  const play = episode.history.played_up_to
  const playedTime = Math.max(...Object.values(play)) || 0
  const playedProportion = playedTime / episode.duration

  return {
    ...episode,
    playedTime,
    playedProportion
  }
}

function byUUID (ary) {
  return ary.reduce((acc, item) => {
    const { uuid } = item
    return {
      ...acc,
      [uuid]: item
    }
  }, {})
}

export async function writeStorkIndexFiles () {
  // podcasts
  const podcastsDirectory = join(dataDirectory, 'podcasts')
  await fs.mkdir(podcastsDirectory, { recursive: true })
  const podcasts = await getPodcasts()
  const podcastsJSONFile = join(podcastsDirectory, 'podcasts.json')
  await fs.writeFile(podcastsJSONFile, JSON.stringify(podcasts.map((p) => {
    const { uuid, title } = p
    return { uuid, title }
  })))
  for (const podcast of podcasts) {
    const { uuid, title, author, description } = podcast
    const podcastFile = join(podcastsDirectory, uuid + '.txt')
    await fs.writeFile(podcastFile, `${title} by ${author}\n\n${description}\n`)
  }

  // episodes
  const episodesDirectory = join(dataDirectory, 'episodes')
  await fs.mkdir(episodesDirectory, { recursive: true })
  const episodes = await getEpisodes()
  for (const episode of episodes) {
    const { uuid, title } = episode
    const episodeFile = join(episodesDirectory, uuid + '.txt')
    await fs.writeFile(episodeFile, `${title}\n`)
  }

  // books
  const booksDirectory = join(dataDirectory, 'books')
  await fs.mkdir(booksDirectory, { recursive: true })
  const books = (await getBooksFeed()).items
  for (const book of books) {
    const { bookId, title, authorName, bookDescription } = book
    const bookFile = join(booksDirectory, bookId + '.txt')
    await fs.writeFile(bookFile, `${title} by ${authorName}\n\n${bookDescription}\n`)
  }

  // config.toml
  const storkConfigFile = join(dataDirectory, 'config.toml')
  await fs.writeFile(storkConfigFile, `
[input]
base_directory = "./"
files = [
${podcasts.map((p) => `{path = "podcasts/${p.uuid}.txt", url = "/podcasts/${p.uuid}", title=${JSON.stringify(p.title)}}`).join(',\n')},
${episodes.map((e) => `{path = "episodes/${e.uuid}.txt", url = "/episodes/${e.uuid}", title=${JSON.stringify(e.title)}}`).join(',\n')},
${books.map((b) => `{path = "books/${b.bookId}.txt", url = "/books/${b.bookId}", title=${JSON.stringify(b.title)}}`).join(',\n')}
]
`)
  console.log(`Done writing indexed files - ${episodes.length} episodes / ${podcasts.length} podcasts`)
}
