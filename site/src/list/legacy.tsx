import { useState } from 'react'
import type { ReactNode } from 'react'
import type { Feed } from '../data/fetch'
import { FeedCount, Field, Heading, control } from '../ui'
import type { Sort, Value } from './query'
import { Table } from './table'
import type { TableProps } from './table'

// The podcasts and episodes pages' old pieces, until they move onto the
// shared list page (#93–#95): a list's title and count, a search box, and a
// table that sorts itself. Then this goes.

export function SearchBox({ value, onChange, label }: { value: string; onChange: (value: string) => void; label: string }) {
  return (
    <Field label={label} className="min-w-[min(100%,16rem)] flex-1">
      <input type="search" className={control} value={value} onChange={(event) => onChange(event.target.value)} />
    </Field>
  )
}

// The search box and filters above a list.
export function Controls({ children }: { children: ReactNode }) {
  return <div className="mb-4 flex flex-wrap items-end gap-x-4 gap-y-3">{children}</div>
}

// A list page: its title and the number of results from its feed.
export function Collection<T>({
  title, feed, results, children,
}: { title: string; feed: Promise<Feed<T>>; results: (data: T) => readonly unknown[]; children: ReactNode }) {
  return (
    <>
      <header className="mb-5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
        <Heading>{title}</Heading>
        <p className="text-muted-foreground tabular-nums" aria-live="polite"><FeedCount feed={feed} count={(data) => results(data).length} unit={['result', 'results']} /></p>
      </header>
      {children}
    </>
  )
}

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' })

function compare(lhs: Value, rhs: Value) {
  return typeof lhs === 'number' && typeof rhs === 'number'
    ? lhs - rhs
    : collator.compare(String(lhs ?? ''), String(rhs ?? ''))
}

// A table that sorts itself: a header click sorts by that column, A→Z or low
// first, and a second click flips it. Shows the first `limit` items.
export function SelfSortingTable<T>({ items, columns, id, limit }: Pick<TableProps<T>, 'items' | 'columns' | 'id'> & { limit?: number }) {
  const [sort, setSort] = useState<Sort>()
  const column = columns.find(({ key }) => key === sort?.key)
  const sorted = column && sort
    ? items.toSorted((a, b) => (sort.descending ? -1 : 1) * compare(column.value(a), column.value(b)))
    : items
  return (
    <Table
      items={sorted.slice(0, limit)}
      columns={columns}
      id={id}
      sorts={sort ? [sort] : []}
      onSort={(key) => setSort({ key, descending: sort?.key === key ? !sort.descending : false })}
    />
  )
}
