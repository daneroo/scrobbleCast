import type { ReactNode } from 'react'
import { localTime } from '../format'

export function RowPanel({ artwork, children }: { artwork: ReactNode; children: ReactNode }) {
  return (
    <div className="grid gap-4 border-t bg-table-stripe p-4 sm:grid-cols-[8rem_1fr]">
      {artwork}
      {children}
    </div>
  )
}

export function PanelFact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="tabular-nums">{children}</dd>
    </div>
  )
}

export function PanelTime({ value }: { value: string | undefined }) {
  const date = new Date(value ?? '')
  return Number.isNaN(date.getTime()) ? '—' : <time dateTime={date.toISOString()}>{localTime(date)}</time>
}
