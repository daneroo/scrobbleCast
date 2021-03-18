// import { promises as fs } from 'fs'
// import { join } from 'path'
import { daysAgo } from './date'
// const dataDirectory = join(process.cwd(), 'data')
// const historyFile = join(dataDirectory, 'history-daniel.json')

const baseURL = 'https://scrobblecast.dl.imetrical.com/api'

async function fetcher (path, qs = { }) {
  const qss = new URLSearchParams(qs).toString()
  const url = `${baseURL}/${path}?${qss}`
  // eslint-disable-next-line no-undef
  const results = await fetch(url)
  const object = await results.json()

  const length = (Array.isArray(object)) ? object.length : 1
  console.info('fetched', { length, url })

  return object
}

export async function getVersions () {
  return fetcher('version')
}

// TODO(daneroo): What to do if not found: empty for now
async function getByUUID (uuid) {
  const items = await fetcher('history', { uuid })
  if (items.length === 0) {
    return {}
  }
  const item = items[0]
  // console.log(JSON.stringify(item, null, 2))
  return item
}

export async function getEpisode (uuid) {
  const episode = await getByUUID(uuid)
  return playDecorate(episode)
}

export async function getPodcast (uuid) {
  return getByUUID(uuid)
}

export async function getEpisodes (days) {
  const since = daysAgo(days)
  return fetcher('history', { type: 'episode', user: 'daniel', since })
}

export async function getPodcasts () {
  return fetcher('history', { type: 'podcast', user: 'daniel' })
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
