import { Link } from '@tanstack/react-router'
import type { Podcast } from '../data/podcasts'
import { shortLines, type ShownField } from '../list/shown'
import { SquareCard } from '../list/square-card'
import type { CardSize } from '../list/view'

export function PodcastCard({ podcast, size, fields }: { podcast: Podcast; size: CardSize; fields: readonly ShownField<Podcast>[] }) {
  return (
    <Link to="/podcasts/$uuid" params={{ uuid: podcast.uuid }} className="group block text-inherit no-underline">
      <SquareCard
        size={size}
        artwork={podcast.thumbnail}
        title={podcast.title}
        byline={podcast.author || '—'}
        lines={shortLines(podcast, fields, 2)}
      />
    </Link>
  )
}
