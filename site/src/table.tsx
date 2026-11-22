import Fuse from 'fuse.js'
import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'

export function useSearch<T>(items: T[], keys: string[], query: string) {
  const fuse = useMemo(() => new Fuse(items, { keys }), [items, keys])
  const term = query.trim()
  return useMemo(() => (term ? fuse.search(term).map(({ item }) => item) : items), [fuse, items, term])
}

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

  if (!items.length) return <p className="empty" role="status">No matches.</p>

  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            {columns.map(({ label }) => {
              const direction = sort?.label === label ? (sort.ascending ? 'ascending' : 'descending') : 'none'
              return (
                <th key={label} scope="col" aria-sort={direction}>
                  <button
                    type="button"
                    onClick={() => setSort({ label, ascending: sort?.label === label ? !sort.ascending : true })}
                  >
                    {label}
                    <span aria-hidden="true">{direction === 'none' ? '↕' : direction === 'ascending' ? '↑' : '↓'}</span>
                  </button>
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {sorted.slice(0, limit).map((item) => (
            <tr key={id(item)}>
              {columns.map(({ label, render, value }) => (
                <td key={label}>{render ? render(item) : value(item)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
