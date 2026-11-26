import { podcastsSearchThreshold } from '../config'
import type { Podcast } from '../data/podcasts'
import { formatDuration } from '../list/duration'
import { defineList } from '../list/query'
import { dateField, type ShownField } from '../list/shown'

function playsText(podcast: Podcast) {
  return podcast.playTotals?.plays.toLocaleString()
}

function listenedText(podcast: Podcast) {
  return podcast.playTotals && formatDuration(podcast.playTotals.listenedSeconds)
}

export const podcastFields = {
  plays: {
    key: 'plays',
    label: 'Plays in window',
    kind: 'number',
    value: (podcast) => podcast.playTotals?.plays,
    note: 'episodes played',
    example: 'plays:>0',
    cell: (podcast) => playsText(podcast) ?? '—',
    short: (podcast) => {
      const plays = playsText(podcast)
      return plays === undefined ? undefined : `${plays} ${podcast.playTotals?.plays === 1 ? 'play' : 'plays'}`
    },
  },
  listened: {
    key: 'listened',
    label: 'Listened in window',
    kind: 'duration',
    value: (podcast) => podcast.playTotals?.listenedSeconds,
    durationAliases: new Map([['>0', '>0s']]),
    note: 'sum of the furthest played positions, with >0 for any listening time',
    example: 'listened:>=1h30m',
    cell: (podcast) => listenedText(podcast) ?? '—',
    short: (podcast) => {
      const listened = listenedText(podcast)
      return listened === undefined ? undefined : `${listened} listened`
    },
  },
  lastPlayed: dateField<Podcast>({
    key: 'played',
    label: 'Last played in window',
    note: 'latest playback date among the episodes counted',
    example: 'played:2026-11',
  }, (podcast) => podcast.playTotals?.lastPlayed, 'last'),
  since: dateField<Podcast>({ key: 'since', label: 'Since', note: 'when the scraper first saw it', example: 'since:<2020' }, (podcast) => podcast.firstSeen, 'since'),
  added: dateField<Podcast>({ key: 'added', label: 'Added', note: 'when subscribed, where the feed knows', example: 'added:2026' }, (podcast) => podcast.added, 'added'),
  title: { key: 'title', label: 'Title', kind: 'text', value: (podcast) => podcast.title, example: 'title:politics' },
  author: { key: 'author', label: 'Author', kind: 'text', value: (podcast) => podcast.author || undefined, example: 'author:bbc' },
} satisfies Record<string, ShownField<Podcast>>

export const podcastsList = defineList<Podcast, ShownField<Podcast>>({
  fields: Object.values(podcastFields),
  searchKeys: ['title', 'author', 'description'],
  searchThreshold: podcastsSearchThreshold,
  defaultSort: [{ key: 'played', descending: true }, { key: 'title', descending: false }],
  lead: ['title', 'author'],
  pinned: () => [],
  fill: () => ['plays', 'listened', 'played', 'since'],
  fillTo: 5,
  most: 5,
  help: { words: 'title, author and description', sort: 'sort:-listened,title', show: 'show:plays,listened,added' },
})
