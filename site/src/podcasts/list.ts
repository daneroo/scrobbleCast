import { podcastsSearchThreshold } from '../config'
import type { Podcast } from '../data/podcasts'
import { day } from '../format'
import { formatDuration } from '../list/duration'
import { defineList } from '../list/query'
import type { ShownField } from '../list/shown'

function dateField(field: Pick<ShownField<Podcast>, 'key' | 'label' | 'note' | 'example'>, date: (podcast: Podcast) => string | undefined): ShownField<Podcast> {
  return { ...field, kind: 'date', value: (podcast) => date(podcast) || undefined, cell: (podcast) => day(date(podcast) ?? '') }
}

const fields: ShownField<Podcast>[] = [
  {
    key: 'plays',
    label: 'Plays in window',
    kind: 'number',
    value: (podcast) => podcast.plays,
    note: 'episodes played',
    example: 'plays:>0',
    cell: (podcast) => podcast.plays?.toLocaleString() ?? '—',
  },
  {
    key: 'listened',
    label: 'Listened in window',
    kind: 'duration',
    value: (podcast) => podcast.listened,
    note: 'sum of the furthest played positions',
    example: 'listened:>=1h30m',
    cell: (podcast) => podcast.listened === undefined ? '—' : formatDuration(podcast.listened),
  },
  dateField({ key: 'played', label: 'Last played in window', example: 'played:2026-11' }, (podcast) => podcast.lastPlayed),
  dateField({ key: 'since', label: 'Since', note: 'when the scraper first saw it', example: 'since:<2020' }, (podcast) => podcast.firstSeen),
  dateField({ key: 'added', label: 'Added', note: 'when subscribed, where the feed knows', example: 'added:2026' }, (podcast) => podcast.added),
  { key: 'title', label: 'Title', kind: 'text', value: (podcast) => podcast.title, example: 'title:politics' },
  { key: 'author', label: 'Author', kind: 'text', value: (podcast) => podcast.author || undefined, example: 'author:bbc' },
]

export const podcastsList = defineList<Podcast, ShownField<Podcast>>({
  fields,
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
