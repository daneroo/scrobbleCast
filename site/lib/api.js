import { promises as fs } from 'fs'
import { join } from 'path'

const dataDirectory = join(process.cwd(), 'data')
const historyFile = join(dataDirectory, 'history-daniel.json')

export async function getHistory () {
  const data = await fs.readFile(historyFile, 'utf8')
  return JSON.parse(data)
}

export async function getEpisodes () {
  const history = await getHistory()
  const episodes = history
  return episodes
}

export async function getEpisodesByUUID () {
  const history = await getHistory()
  console.log(history.length)
  const podcastsByUuid = history.reduce((acc, episode) => {
    const { uuid } = episode
    return {
      ...acc,
      [uuid]: episode
    }
  }, {})
  return podcastsByUuid
}

export async function getPodcastsByUUID () {
  const history = await getHistory()
  console.log(history.length)
  const podcastsByUuid = history.reduce((acc, { podcast_uuid: uuid, podcast_title: title }) => {
    return {
      ...acc,
      [uuid]: { uuid, title, count: 1 }
    }
  }, {})
  return podcastsByUuid
}

export async function getPodcasts () {
  const podcastsByUuid = await getPodcastsByUUID()
  const podcasts = Object.values(podcastsByUuid)
  return podcasts
}
