import { expect, test } from 'vite-plus/test'
import type { Podcast } from '../data/podcasts'
import { shortLines } from '../list/shown'
import { podcastsList } from './list'

function podcast(fields: Partial<Podcast> = {}): Podcast {
  return {
    uuid: 'podcast',
    title: 'Podcast',
    author: '',
    description: '',
    thumbnail: '',
    firstSeen: '2020-01-01T00:00:00Z',
    ...fields,
  }
}

function shown(text: string) {
  return podcastsList.shown(podcastsList.parse(text)).map(({ key }) => key)
}

function titles(podcasts: Podcast[], text: string) {
  return podcastsList.run(podcasts, podcastsList.parse(text)).map(({ title }) => title)
}

test('the default fields are plays, listened, last played and since', () => {
  expect(shown('')).toEqual(['plays', 'listened', 'played', 'since'])
  expect(shown('author:bbc sort:-added,title')).toEqual(['added', 'plays', 'listened', 'played', 'since'])
  expect(shown('show:added,author')).toEqual(['added', 'author'])
})

test('plays:0 matches a known zero, excluding podcasts without episode data yet', () => {
  const podcasts = [
    podcast({ title: 'Played', playTotals: { plays: 1, listenedSeconds: 60 } }),
    podcast({ title: 'No plays', playTotals: { plays: 0, listenedSeconds: 0 } }),
    podcast({ title: 'Still loading' }),
  ]
  expect(titles(podcasts, 'plays:0')).toEqual(['No plays'])
})

test('card lines distinguish known zero totals from unknown totals and follow the shown fields', () => {
  const fields = podcastsList.shown(podcastsList.parse('show:listened,plays,since'))
  expect(shortLines(podcast({ playTotals: { plays: 0, listenedSeconds: 0 } }), fields, 2)).toEqual([
    ['listened', '0m listened'],
    ['plays', '0 plays'],
  ])
  expect(shortLines(podcast(), fields, 2)).toEqual([['since', 'since 2020-01-01']])
})

test('listened: filters durations in units and accepts >0 for any listening time', () => {
  const podcasts = [
    podcast({ title: 'Zero', playTotals: { plays: 0, listenedSeconds: 0 } }),
    podcast({ title: 'Short', playTotals: { plays: 1, listenedSeconds: 900 } }),
    podcast({ title: 'Long', playTotals: { plays: 1, listenedSeconds: 5400 } }),
    podcast({ title: 'Still loading' }),
  ]
  expect(titles(podcasts, 'listened:>=1h30m')).toEqual(['Long'])
  expect(titles(podcasts, 'listened:<20m sort:-listened')).toEqual(['Short', 'Zero'])
  expect(titles(podcasts, 'listened:0m')).toEqual(['Zero'])
  expect(titles(podcasts, 'listened:>0 sort:-listened')).toEqual(['Long', 'Short'])
  expect(podcastsList.parse('listened:90').notUnderstood).toEqual(['listened:90'])
})

test('the default sort orders by last played, then title, with missing dates last', () => {
  const podcasts = [
    podcast({ title: 'Undated' }),
    podcast({ title: 'Zeta', playTotals: { plays: 1, listenedSeconds: 20, lastPlayed: '2026-11-25T10:00:00Z' } }),
    podcast({ title: 'Earlier', playTotals: { plays: 1, listenedSeconds: 20, lastPlayed: '2026-11-03T10:00:00Z' } }),
    podcast({ title: 'Alpha', playTotals: { plays: 1, listenedSeconds: 20, lastPlayed: '2026-11-25T10:00:00Z' } }),
  ]
  expect(titles(podcasts, '')).toEqual(['Alpha', 'Zeta', 'Earlier', 'Undated'])
  expect(titles(podcasts, 'played:2026-11-25')).toEqual(['Alpha', 'Zeta'])
})
