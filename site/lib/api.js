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

export async function getApiSignature () {
  const versions = await fetcher('version')
  const generatedAt = new Date().toISOString()
  return {
    versions,
    generatedAt
  }
}

const cache = {
  episode: {},
  podcast: {}
}

// TODO(daneroo): What to do if not found: empty for now
async function getByUUID ({ uuid, type }) {
  if (cache[type][uuid]) {
    return cache[type][uuid]
  }
  const items = await fetcher('history', { uuid, type })
  if (items.length === 0) {
    return {}
  }
  const item = items[0]
  // console.log(JSON.stringify(item, null, 2))
  return item
}

export async function getEpisode (uuid) {
  const episode = await getByUUID({ uuid, type: 'episode' })
  return playDecorate(episode)
}

export async function getPodcast (uuid) {
  return getByUUID({ uuid, type: 'podcast' })
}

const defaultDays = 15
export async function getEpisodes (days = defaultDays) {
  const since = daysAgo(days)
  const episodes = await fetcher('history', { type: 'episode', user: 'daniel', since })
  for (const e of episodes) {
    cache.episode[e.uuid] = e
  }
  console.log('+|Episode Cache|', Object.keys(cache.episode).length)
  return episodes
}

export async function getPodcasts () {
  const podcasts = await fetcher('history', { type: 'podcast', user: 'daniel' })
  for (const p of podcasts) {
    cache.podcast[p.uuid] = p
  }
  console.log('+|Podcast Cache|', Object.keys(cache.podcast).length)

  return podcasts
}

export async function getBooksFeed () {
  const booksFile = join(process.cwd(), 'public', 'books', 'goodreads-rss.json')
  const booksFeed = JSON.parse(await fs.readFile(booksFile, { encoding: 'utf8' }))
  console.log('+|Books (uncached)|', booksFeed.items.length)
  return booksFeed
}
export async function getBook (bookId) {
  const booksFeed = await getBooksFeed()
  const found = booksFeed.items.filter((b) => b.bookId === bookId)
  return found?.[0]
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
  const episodesDirectory = join(dataDirectory, 'episodes')
  await fs.mkdir(episodesDirectory, { recursive: true })
  const episodes = await getEpisodes()
  for (const episode of episodes) {
    const { uuid, title } = episode
    const episodeFile = join(episodesDirectory, uuid + '.txt')
    await fs.writeFile(episodeFile, `${title}\n`)
  }

  const storkConfigFile = join(dataDirectory, 'config.toml')
  await fs.writeFile(storkConfigFile, `
[input]
base_directory = "./"
files = [
${podcasts.map((p) => `{path = "podcasts/${p.uuid}.txt", url = "/podcasts/${p.uuid}", title=${JSON.stringify(p.title)}}`).join(',\n')},
${episodes.map((e) => `{path = "episodes/${e.uuid}.txt", url = "/episodes/${e.uuid}", title=${JSON.stringify(e.title)}}`).join(',\n')}
]
 
[output]
filename = "scrobblecast.st"
`)
  console.log('Done writing indexed files')
}
