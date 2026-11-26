import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import type { Episode } from '../data/podcasts'
import { localTime } from '../format'
import { cellOf } from '../list/table'
import { Artwork } from '../ui'
import { episodeField } from './list'

function dateAndTime(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : <time dateTime={date.toISOString()}>{localTime(date)}</time>
}

function fact(key: string, show?: (episode: Episode) => ReactNode): [label: string, show: (episode: Episode) => ReactNode] {
  const field = episodeField(key)
  return [field.label, show ?? ((episode) => cellOf(field, episode))]
}

const facts = [
  fact('podcast', ({ podcastId, podcastTitle }) => podcastId && podcastTitle
    ? <Link to="/podcasts/$uuid" params={{ uuid: podcastId }}>{podcastTitle}</Link>
    : '—'),
  fact('status'),
  fact('progress'),
  fact('duration'),
  fact('published', (episode) => dateAndTime(episode.published)),
  fact('first', (episode) => dateAndTime(episode.firstPlayed)),
  fact('played', (episode) => dateAndTime(episode.lastPlayed)),
  ['Audio', ({ url }) => url ? <a href={url} target="_blank" rel="noreferrer">Open audio</a> : '—'],
] satisfies [string, (episode: Episode) => ReactNode][]

export function EpisodePanel({ episode }: { episode: Episode }) {
  return (
    <div className="grid items-start gap-4 border-t bg-table-stripe p-4 sm:grid-cols-[8rem_1fr]">
      <Artwork src={episode.artwork} className="w-16 sm:w-32" />
      <dl className="grid min-w-0 grid-cols-2 gap-x-4 gap-y-2 text-sm wrap-anywhere sm:grid-cols-3">
        {facts.map(([label, show]) => (
          <div key={label}>
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="tabular-nums">{show(episode)}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
