import { Link } from '@tanstack/react-router'
import type { Episode } from '../data/podcasts'
import { shortLines, type ShownField } from '../list/shown'
import { SquareCard } from '../list/square-card'
import { cellOf } from '../list/table'
import type { CardSize } from '../list/view'
import { episodeField } from './list'

const largeFields = new Set(['podcast', 'status', 'progress'])
const status = episodeField('status')
const progress = episodeField('progress')

export function EpisodeCard({ episode, size, fields }: { episode: Episode; size: CardSize; fields: readonly ShownField<Episode>[] }) {
  const large = size === 'large'
  const lines = shortLines(episode, large ? fields.filter(({ key }) => !largeFields.has(key)) : fields, 2)
  return (
    <Link to="/episodes/$uuid" params={{ uuid: episode.uuid }} className="group block text-inherit no-underline">
      <SquareCard
        size={size}
        artwork={episode.artwork}
        title={episode.title}
        byline={large ? episode.podcastTitle || '—' : undefined}
        details={large && <><span>{cellOf(status, episode)}</span><span>{cellOf(progress, episode)}</span></>}
        lines={lines}
      />
    </Link>
  )
}
