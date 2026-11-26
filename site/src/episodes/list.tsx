import { episodesSearchThreshold } from '../config'
import { statuses, type Episode, type Status } from '../data/podcasts'
import { formatDuration } from '../list/duration'
import { defineList, namedChoices } from '../list/query'
import { dateField, type ShownField } from '../list/shown'
import { Badge, Progress } from '../ui'

// The episodes list's query: its fields, search keys, default sort and the
// default-fields rule (spec #91, "Episodes list").

const statusNames: Record<Status, string> = { unplayed: 'Unplayed', 'in-progress': 'In progress', finished: 'Finished' }

// In the order the help lists them.
const fields: ShownField<Episode>[] = [
  dateField({ key: 'played', label: 'Last played', example: 'played:2026-11' }, (episode) => episode.lastPlayed, 'played'),
  dateField({ key: 'first', label: 'First played', example: 'first:<2026' }, (episode) => episode.firstPlayed, 'first played'),
  dateField({ key: 'published', label: 'Published', example: 'published:<2020' }, (episode) => episode.published, 'pub.'),
  {
    key: 'duration',
    label: 'Duration',
    kind: 'duration',
    value: (episode) => episode.duration || undefined,
    example: 'duration:>=1h30m',
    cell: (episode) => episode.duration ? formatDuration(episode.duration) : '—',
    short: (episode) => episode.duration ? formatDuration(episode.duration) : undefined,
  },
  {
    key: 'progress',
    label: 'Progress',
    kind: 'number',
    value: (episode) => episode.progress,
    note: 'percent of the duration, the furthest played',
    example: 'progress:<50',
    cell: (episode) => <Progress value={episode.progress} />,
    short: (episode) => episode.progress === undefined ? undefined : `${Math.round(episode.progress)}%`,
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
    short: (episode) => episode.status && statusNames[episode.status],
  },
  {
    key: 'podcast',
    label: 'Podcast',
    kind: 'text',
    value: (episode) => episode.podcastTitle || undefined,
    // Its title anywhere, or its id from the start: `podcast:politics`,
    // `podcast:34edb770`.
    filterValue: (episode) => [episode.podcastTitle, { start: episode.podcastId }],
    note: "a word in the podcast's title, or the start of its id",
    example: 'podcast:politics',
    short: (episode) => episode.podcastTitle || undefined,
  },
  { key: 'title', label: 'Title', kind: 'text', value: (episode) => episode.title, example: 'title:interview' },
]

export function episodeField(key: string) {
  const field = fields.find((each) => each.key === key)
  if (!field) throw new Error(`No episodes field: ${key}`)
  return field
}

export const episodesList = defineList<Episode, ShownField<Episode>>({
  fields,
  searchKeys: ['title', 'podcastTitle'],
  searchThreshold: episodesSearchThreshold,
  // The latest played first; episodes with no last-played date follow,
  // newest published first.
  defaultSort: [{ key: 'played', descending: true }, { key: 'published', descending: true }],
  // The table's lead column: artwork, title and podcast.
  lead: ['title', 'podcast'],
  // The status, unless the query names exactly one; it doesn't count toward
  // the four filled. Then published and duration for unplayed only;
  // otherwise last played, duration, progress and published.
  pinned: (query) => namedChoices(query, 'status').length === 1 ? [] : ['status'],
  fill: (query) => {
    const named = namedChoices(query, 'status')
    return named.length === 1 && named[0] === 'unplayed' ? ['published', 'duration'] : ['played', 'duration', 'progress', 'published']
  },
  fillTo: 4,
  fillBesidesPinned: true,
  most: 5,
  help: { words: "title and podcast's title", sort: 'sort:-duration,-played', show: 'show:duration,progress,played' },
})
