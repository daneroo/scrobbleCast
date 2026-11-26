import { shelfName } from '../data/books'

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
  return <span className="inline-block rounded-full border px-2 py-0.5 text-xs whitespace-nowrap text-muted-foreground">{shelfName(shelf)}</span>
}

export function Progress({ value }: { value: number | undefined }) {
  if (value === undefined) return <span className="text-muted-foreground">—</span>
  return (
    <span className="inline-flex items-center gap-2">
      <span className="h-1.5 w-16 overflow-hidden rounded-full bg-table-stripe ring-1 ring-border">
        <span className="block h-full bg-primary" style={{ width: `${Math.min(value, 100)}%` }} />
      </span>
      <span className="tabular-nums">{Math.round(value)}%</span>
    </span>
  )
}
