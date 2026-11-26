import type { ReactNode } from 'react'
import { Artwork, classes } from '../ui'
import type { CardSize } from './view'

// The contents of a square-artwork card. The list supplies its link and text.
export function SquareCard({ size, artwork, title, byline, details, lines }: {
  size: CardSize
  artwork: string | undefined
  title: string
  byline?: string
  details?: ReactNode
  lines: readonly [key: string, line: ReactNode][]
}) {
  return (
    <span className={classes('grid grid-cols-1', size === 'small' ? 'gap-1.5' : 'gap-2')}>
      <Artwork src={artwork} className="w-full" />
      <span className={classes('line-clamp-2 leading-snug font-semibold wrap-anywhere group-hover:underline', size === 'small' && 'text-sm')}>{title}</span>
      {byline && <span className="truncate text-sm text-muted-foreground">{byline}</span>}
      {details && <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">{details}</span>}
      {lines.length > 0 && (
        <span className="grid gap-0.5 text-xs text-muted-foreground tabular-nums">
          {lines.map(([key, line]) => <span key={key} className="truncate">{line}</span>)}
        </span>
      )}
    </span>
  )
}
