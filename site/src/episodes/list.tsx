import { episodesSearchThreshold } from '../config'
import { statuses, type Episode, type Status } from '../data/podcasts'
import { day } from '../format'
import { formatDuration } from '../list/duration'
import { defineList } from '../list/query'
import type { Query } from '../list/query'
import type { ShownField } from '../list/shown'
import { Badge, Progress } from '../ui'

// The episodes list's query: its fields, search keys, default sort and the
// default-fields rule (spec #91, "Episodes list").

const statusNames: Record<Status, string> = { unplayed: 'Unplayed', 'in-progress': 'In progress', finished: 'Finished' }

// A date field: the feed's ISO 8601 time, shown and filtered at that, as its
// day in the table.
function dateField(field: Pick<ShownField<Episode>, 'key' | 'label' | 'note' | 'example'>, date: (episode: Episode) => string): ShownField<Episode> {
  return { ...field, kind: 'date', value: (episode) => date(episode) || undefined, cell: (episode) => day(date(episode)) }
}

// In the order the help lists them.
const fields: ShownField<Episode>[] = [
  dateField({ key: 'played', label: 'Last played', example: 'played:2026-11' }, (episode) => episode.lastPlayed),
  dateField({ key: 'first', label: 'First played', example: 'first:<2026' }, (episode) => episode.firstPlayed),
  dateField({ key: 'published', label: 'Published', example: 'published:<2020' }, (episode) => episode.published),
  {
    key: 'duration',
    label: 'Duration',
    kind: 'duration',
    value: (episode) => episode.duration || undefined,
    example: 'duration:>=1h30m',
    cell: (episode) => episode.duration ? formatDuration(episode.duration) : '—',
  },
  {
    key: 'progress',
    label: 'Progress',
    kind: 'number',
    value: (episode) => episode.progress,
    note: 'percent of the duration, the furthest played',
    example: 'progress:<50',
    cell: (episode) => <Progress value={episode.progress} />,
  },
  {
    key: 'status',
    label: 'Status',
    kind: 'choice',
    choices: statuses,
    // Sorted and shown by its name, filtered by its key (`in-progress`).
    value: (episode) => episode.status && statusNames[episode.status],
    filterValue: (episode) => episode.status,
    note: "Pocket Casts' own: finished is its mark, not a share played",
    example: 'status:in-progress',
    cell: (episode) => episode.status ? <Badge>{statusNames[episode.status]}</Badge> : '—',
  },
  {
    key: 'podcast',
    label: 'Podcast',
    kind: 'text',
    value: (episode) => episode.podcastTitle || undefined,
    // Its title or its id: `podcast:politics`, `podcast:34edb770`.
    filterValue: (episode) => [episode.podcastTitle, episode.podcastId],
    note: "a word in the podcast's title, or the start of its id",
    example: 'podcast:politics',
  },
  { key: 'title', label: 'Title', kind: 'text', value: (episode) => episode.title, example: 'title:interview' },
]

// The statuses the query names: those every status filter allows, or none
// without one.
function namedStatuses(query: Query) {
  let named: readonly string[] | undefined
  for (const filter of query.filters) {
    if (filter.kind !== 'choice' || filter.key !== 'status') continue
    named = named ? named.filter((status) => filter.choices.includes(status)) : filter.choices
  }
  return named ?? []
}

export const episodesList = defineList<Episode, ShownField<Episode>>({
  fields,
  searchKeys: ['title', 'podcastTitle'],
  searchThreshold: episodesSearchThreshold,
  // The latest played first; unplayed episodes, which have no last played,
  // follow, newest published first.
  defaultSort: [{ key: 'played', descending: true }, { key: 'published', descending: true }],
  // The table's lead column: artwork, title and podcast.
  lead: ['title', 'podcast'],
  // The status, unless the query names exactly one.
  pinned: (query) => namedStatuses(query).length === 1 ? [] : ['status'],
  fill: (query) => {
    const named = namedStatuses(query)
    return named.length === 1 && named[0] === 'unplayed' ? ['published', 'duration'] : ['played', 'duration', 'progress', 'published']
  },
  fillTo: 4,
  most: 5,
  help: { words: "title and podcast's title", sort: 'sort:-duration,-played', show: 'show:duration,progress,played' },
})
