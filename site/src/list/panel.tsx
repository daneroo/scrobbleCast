import type { ReactNode } from 'react'

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
