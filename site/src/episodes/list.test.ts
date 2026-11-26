import { expect, test } from 'vite-plus/test'
import type { Episode } from '../data/podcasts'
import { episodesList } from './list'

let lastId = 0

// An episode with plain defaults: an hour long, published 2026-11-01, never
// played, of a podcast "Podcast".
function episode(fields: Partial<Episode> = {}): Episode {
  const id = String(++lastId)
  return {
    uuid: `episode-${id}`,
    title: `Episode ${id}`,
    podcastId: '34edb770-79ec-013a-d7bd-0acc26574db2',
    podcastTitle: 'Podcast',
    artwork: '',
    url: `https://example.com/${id}.mp3`,
    published: '2026-11-01T10:00:00Z',
    duration: 3600,
    playedSeconds: 0,
    progress: 0,
    status: 'unplayed',
    firstPlayed: '',
    lastPlayed: '',
    ...fields,
  }
}

// A played episode: `progress` percent of an hour, first and last played on
// `played`.
function played(played: string, fields: Partial<Episode> = {}): Episode {
  return episode({ status: 'in-progress', playedSeconds: 1800, progress: 50, firstPlayed: played, lastPlayed: played, ...fields })
}

function shown(text: string) {
  return episodesList.shown(episodesList.parse(text)).map(({ key }) => key)
}

function titles(episodes: Episode[], text: string) {
  return episodesList.run(episodes, episodesList.parse(text)).map(({ title }) => title)
}

test('with no status named: the status, then last played, duration, progress', () => {
  expect(shown('')).toEqual(['status', 'played', 'duration', 'progress'])
  expect(shown('politics')).toEqual(['status', 'played', 'duration', 'progress'])
  expect(shown('status:unplayed,finished')).toEqual(['status', 'played', 'duration', 'progress'])
})

test('one status named, not unplayed: last played, duration, progress, published', () => {
  expect(shown('status:finished')).toEqual(['played', 'duration', 'progress', 'published'])
  expect(shown('status:in-progress')).toEqual(['played', 'duration', 'progress', 'published'])
})

test('only unplayed: published and duration', () => {
  expect(shown('status:unplayed')).toEqual(['published', 'duration'])
  expect(shown('status:un')).toEqual(['published', 'duration'])
})

test('a filter or sort adds its field, at most five in all', () => {
  expect(shown('status:finished duration:>=1h30m sort:-duration')).toEqual(['duration', 'played', 'progress', 'published'])
  expect(shown('progress:<50 sort:first')).toEqual(['status', 'progress', 'first', 'played'])
  expect(shown('progress:<50 duration:>1h published:2026 played:2026 sort:first')).toEqual(['status', 'progress', 'duration', 'published', 'played'])
})

test('a filter or sort on the title or podcast adds no field', () => {
  expect(shown('podcast:politics sort:title')).toEqual(['status', 'played', 'duration', 'progress'])
})

test('without words or sort:, the latest played first, then unplayed episodes, newest published first', () => {
  const episodes = [
    episode({ title: 'Old news', published: '2026-10-01T10:00:00Z' }),
    played('2026-11-20T10:00:00Z', { title: 'Earlier' }),
    episode({ title: 'New', published: '2026-11-25T10:00:00Z' }),
    played('2026-11-24T10:00:00Z', { title: 'Latest' }),
    episode({ title: 'Undated', published: '' }),
  ]
  expect(titles(episodes, '')).toEqual(['Latest', 'Earlier', 'New', 'Old news', 'Undated'])
})

test('episodes with no value for the sorted field go last, whatever the direction', () => {
  const episodes = [
    episode({ title: 'Unplayed' }),
    played('2026-11-20T10:00:00Z', { title: 'Earlier' }),
    played('2026-11-24T10:00:00Z', { title: 'Latest' }),
  ]
  expect(titles(episodes, 'sort:-played')).toEqual(['Latest', 'Earlier', 'Unplayed'])
  expect(titles(episodes, 'sort:played')).toEqual(['Earlier', 'Latest', 'Unplayed'])
  const lengths = [episode({ title: 'Unknown', duration: 0 }), episode({ title: 'Short', duration: 600 }), episode({ title: 'Long', duration: 7200 })]
  expect(titles(lengths, 'sort:duration')).toEqual(['Short', 'Long', 'Unknown'])
  expect(titles(lengths, 'sort:-duration')).toEqual(['Long', 'Short', 'Unknown'])
})

const podcasts = [
  episode({ title: 'Rest', podcastTitle: 'The Rest Is Politics', podcastId: '34edb770-79ec-013a-d7bd-0acc26574db2' }),
  episode({ title: 'Syntax', podcastTitle: 'Syntax - Tasty Web Development Treats', podcastId: 'fe30f8e0-3da9-0135-9028-63f4b61a9224' }),
]

test('podcast: filters by a word in the podcast’s title', () => {
  expect(titles(podcasts, 'podcast:politics')).toEqual(['Rest'])
  expect(titles(podcasts, 'podcast:Tasty')).toEqual(['Syntax'])
})

test('podcast: filters by the start of the podcast’s id', () => {
  expect(titles(podcasts, 'podcast:34edb770')).toEqual(['Rest'])
  expect(titles(podcasts, 'podcast:fe30f8e0-3da9')).toEqual(['Syntax'])
})

test('duration: filters by durations typed in units; a bare number is not understood', () => {
  const episodes = [
    episode({ title: 'Short', duration: 20 * 60 }),
    episode({ title: 'Hour', duration: 3600 }),
    episode({ title: 'Long', duration: 2 * 3600 + 5 * 60 }),
    episode({ title: 'Unknown', duration: 0 }),
  ]
  expect(titles(episodes, 'duration:>=1h30m')).toEqual(['Long'])
  expect(titles(episodes, 'duration:<45m')).toEqual(['Short'])
  expect(titles(episodes, 'duration:<=1h sort:-duration')).toEqual(['Hour', 'Short'])
  expect(titles(episodes, 'duration:=1h')).toEqual(['Hour'])
  expect(episodesList.parse('duration:>90').notUnderstood).toEqual(['duration:>90'])
})

test('status: filters by status, comma lists too; an episode with no status matches none', () => {
  const episodes = [
    episode({ title: 'New' }),
    played('2026-11-24T10:00:00Z', { title: 'Started' }),
    played('2026-11-20T10:00:00Z', { title: 'Done', status: 'finished', progress: 97 }),
    episode({ title: 'Unknown', status: undefined }),
  ]
  expect(titles(episodes, 'status:finished')).toEqual(['Done'])
  expect(titles(episodes, 'status:in-progress,unplayed')).toEqual(['Started', 'New'])
})

test('progress: filters by the percentage played', () => {
  const episodes = [
    played('2026-11-24T10:00:00Z', { title: 'Barely', progress: 5 }),
    played('2026-11-20T10:00:00Z', { title: 'Mostly', progress: 80 }),
    episode({ title: 'No duration', duration: 0, progress: undefined }),
  ]
  expect(titles(episodes, 'progress:<50')).toEqual(['Barely'])
})

test('words search the title and the podcast’s title, every word matching', () => {
  const episodes = [
    episode({ title: 'Election night', podcastTitle: 'The Rest Is Politics' }),
    episode({ title: 'CSS tricks', podcastTitle: 'Syntax' }),
  ]
  expect(titles(episodes, 'election')).toEqual(['Election night'])
  expect(titles(episodes, 'syntax')).toEqual(['CSS tricks'])
  expect(titles(episodes, 'election politics')).toEqual(['Election night'])
  expect(titles(episodes, 'election syntax')).toEqual([])
})

test('every help example is understood', () => {
  const { fields, sort, show } = episodesList.help()
  expect(fields.map(({ key }) => key)).toEqual(['played', 'first', 'published', 'duration', 'progress', 'status', 'podcast', 'title'])
  for (const example of [...fields.map(({ example }) => example), sort.example, show.example]) {
    expect(episodesList.parse(example).notUnderstood).toEqual([])
  }
})
