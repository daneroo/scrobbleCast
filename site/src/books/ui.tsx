import { shelfName } from '../data/books'
import { Badge } from '../ui'

// Small pieces for showing a book, shared by the registry's cells and the
// cards.

export function Stars({ value }: { value: number }) {
  if (!value) return <span className="text-muted-foreground">—</span>
  const stars = Math.round(value)
  return (
    <span className="whitespace-nowrap tracking-tight" role="img" aria-label={`${value} of 5`} title={`${value} of 5`}>
      <span className="text-accent">{'★'.repeat(stars)}</span>
      <span className="text-muted-foreground opacity-50">{'★'.repeat(5 - stars)}</span>
    </span>
  )
}

export function ShelfBadge({ shelf }: { shelf: string }) {
  return <Badge>{shelfName(shelf)}</Badge>
}
