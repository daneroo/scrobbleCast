import { useState } from 'react'
import type { ReactNode } from 'react'
import { Panel, classes } from './ui'

export interface Column<T> {
  label: string
  value: (item: T) => string | number
  render?: (item: T) => ReactNode
}

interface TableProps<T> {
  items: T[]
  columns: Column<T>[]
  id: (item: T) => string
  limit?: number
}

// Every cell; then body cells: the first column (titles) takes the room, the
// last (dates, percentages) stays on one line.
const cell = 'border-b px-3 py-3 sm:px-5'
const bodyCell = 'align-top leading-normal first:w-[52%] first:min-w-40 sm:first:min-w-48 last:whitespace-nowrap last:tabular-nums'

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' })

export function Table<T>({ items, columns, id, limit }: TableProps<T>) {
  const [sort, setSort] = useState<{ label: string; ascending: boolean }>()
  const column = columns.find(({ label }) => label === sort?.label)
  const sorted = column && sort
    ? items.toSorted((a, b) => {
        const lhs = column.value(a)
        const rhs = column.value(b)
        const comparison = typeof lhs === 'number' && typeof rhs === 'number'
          ? lhs - rhs
          : collator.compare(String(lhs), String(rhs))
        return sort.ascending ? comparison : -comparison
      })
    : items

  if (!items.length) return <Panel role="status">No matches.</Panel>

  return (
    <div className="overflow-x-auto rounded-lg border bg-card">
      <table className="w-full text-left">
        <thead>
          <tr>
            {columns.map(({ label }) => {
              const direction = sort?.label === label ? (sort.ascending ? 'ascending' : 'descending') : 'none'
              return (
                <th key={label} scope="col" aria-sort={direction} className={classes(cell, 'bg-table-heading whitespace-nowrap')}>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 py-1 font-bold text-accent"
                    onClick={() => setSort({ label, ascending: sort?.label === label ? !sort.ascending : true })}
                  >
                    {label}
                    <span aria-hidden="true" className="text-[0.85em]">{direction === 'none' ? '↕' : direction === 'ascending' ? '↑' : '↓'}</span>
                  </button>
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody className="[&>tr:last-child>td]:border-b-0">
          {sorted.slice(0, limit).map((item) => (
            <tr key={id(item)} className="even:bg-table-stripe">
              {columns.map(({ label, render, value }) => (
                <td key={label} className={classes(cell, bodyCell)}>{render ? render(item) : value(item)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
