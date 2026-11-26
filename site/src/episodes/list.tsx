import { episodesSearchThreshold } from '../config'
import { statuses, type Episode, type Status } from '../data/podcasts'
import { formatPercent } from '../format'
import { formatDuration } from '../list/duration'
import { defineList, namedChoices } from '../list/query'
import { dateField, type ShownField } from '../list/shown'
import { Badge, Progress } from '../ui'

// The episodes list's query: its fields, search keys, default sort and the
// default-fields rule (spec #91, "Episodes list").

const statusNames: Record<Status, string> = { unplayed: 'Unplayed', 'in-progress': 'In progress', finished: 'Finished' }

function statusName(episode: Episode) {
  return episode.status && statusNames[episode.status]
}

function durationText(episode: Episode) {
  return episode.duration ? formatDuration(episode.duration) : undefined
}

// In the order the help lists them.
export const episodeFields = {
  lastPlayed: dateField<Episode>({ key: 'played', label: 'Last played', example: 'played:2026-11' }, (episode) => episode.lastPlayed, 'last'),
  firstPlayed: dateField<Episode>({ key: 'first', label: 'First played', example: 'first:<2026' }, (episode) => episode.firstPlayed, 'first'),
  published: dateField<Episode>({ key: 'published', label: 'Published', example: 'published:<2020' }, (episode) => episode.published, 'pub.'),
  duration: {
    key: 'duration',
    label: 'Duration',
    kind: 'duration',
    value: (episode) => episode.duration || undefined,
    example: 'duration:>=1h30m',
    cell: (episode) => durationText(episode) ?? '—',
    short: durationText,
  },
  progress: {
    key: 'progress',
    label: 'Progress',
    kind: 'number',
    value: (episode) => episode.progress,
    note: 'percent of the duration, the furthest played',
    example: 'progress:<50',
    cell: (episode) => <Progress value={episode.progress} />,
    short: (episode) => episode.progress === undefined ? undefined : formatPercent(episode.progress),
  },
  status: {
    key: 'status',
    label: 'Status',
    kind: 'choice',
    choices: statuses,
    // Sorted and shown by its name, filtered by its key (`in-progress`).
    value: statusName,
    filterValue: (episode) => episode.status,
    note: "Pocket Casts' own: finished is its mark, not a share played",
    example: 'status:in-progress',
    cell: (episode) => {
      const name = statusName(episode)
      return name ? <Badge>{name}</Badge> : '—'
    },
    short: statusName,
  },
  podcast: {
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
  title: { key: 'title', label: 'Title', kind: 'text', value: (episode) => episode.title, example: 'title:interview' },
} satisfies Record<string, ShownField<Episode>>

export const episodesList = defineList<Episode, ShownField<Episode>>({
  fields: Object.values(episodeFields),
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
