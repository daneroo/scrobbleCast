import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import type { Episode } from '../data/podcasts'
import { localTime } from '../format'
import { PanelFact, RowPanel } from '../list/panel'
import type { ShownField } from '../list/shown'
import { cellOf } from '../list/table'
import { Artwork } from '../ui'
import { episodeFields } from './list'

function dateAndTime(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : <time dateTime={date.toISOString()}>{localTime(date)}</time>
}

function fact(field: ShownField<Episode>, show?: (episode: Episode) => ReactNode): [label: string, show: (episode: Episode) => ReactNode] {
  return [field.label, show ?? ((episode) => cellOf(field, episode))]
}

const facts = [
  fact(episodeFields.podcast, ({ podcastId, podcastTitle }) => podcastId && podcastTitle
    ? <Link to="/podcasts/$uuid" params={{ uuid: podcastId }}>{podcastTitle}</Link>
    : '—'),
  fact(episodeFields.status),
  fact(episodeFields.progress),
  fact(episodeFields.duration),
  fact(episodeFields.published, (episode) => dateAndTime(episode.published)),
  fact(episodeFields.firstPlayed, (episode) => dateAndTime(episode.firstPlayed)),
  fact(episodeFields.lastPlayed, (episode) => dateAndTime(episode.lastPlayed)),
  ['Audio', ({ url }) => url ? <a href={url} target="_blank" rel="noreferrer">Open audio</a> : '—'],
] satisfies [string, (episode: Episode) => ReactNode][]

export function EpisodePanel({ episode }: { episode: Episode }) {
  return (
    <RowPanel artwork={<Artwork src={episode.artwork} className="w-16 self-start sm:w-32" />}>
      <dl className="grid min-w-0 grid-cols-2 gap-x-4 gap-y-2 text-sm wrap-anywhere sm:grid-cols-3">
        {facts.map(([label, show]) => (
          <PanelFact key={label} label={label}>{show(episode)}</PanelFact>
        ))}
      </dl>
    </RowPanel>
  )
}
