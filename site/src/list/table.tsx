import { useState } from 'react'
import type { ReactNode } from 'react'
import { Panel, classes } from '../ui'
import type { Sort } from './query'

// A list's table, generic over its items: nothing here knows books, podcasts
// or episodes.

// A column: its key (what a sort names), header label, plain value (to sort
// by, and the cell when there is no `cell`), and optional cell. A query
// list's fields have this shape. `sortable: false` gives it no sort button.
export interface Column<T> {
  key: string
  label: string
  value: (item: T) => string | number | undefined
  cell?: (item: T) => ReactNode
  sortable?: boolean
}

interface TableProps<T> {
  items: readonly T[]
  columns: Column<T>[]
  id: (item: T) => string
  sorts: readonly Sort[]
  // A header click; the caller decides the new sorts.
  onSort: (key: string) => void
  // When given, a row click opens this below the row, and a second click
  // closes it.
  expandedRow?: (item: T) => ReactNode
}

// Every cell; then body cells: the first column (titles) takes the room, the
// last (dates, percentages) stays on one line.
const cellClass = 'border-b px-3 py-3 sm:px-5'
const bodyCellClass = 'align-top leading-normal first:w-[52%] first:min-w-40 sm:first:min-w-48 last:whitespace-nowrap last:tabular-nums'

// A table whose order comes from outside: it draws `items` as given, and shows
// `sorts` in its headers. The main sort gets `aria-sort`; tie-breaks get an
// arrow with their rank, and the same in words for screen readers.
export function Table<T>({ items, columns, id, sorts, onSort, expandedRow }: TableProps<T>) {
  const [openId, setOpenId] = useState<string>()

  if (!items.length) return <Panel role="status">No matches.</Panel>

  return (
    <div className="overflow-x-auto rounded-lg border bg-card">
      <table className="w-full text-left">
        <thead>
          <tr>
            {columns.map(({ key, label, sortable = true }) => {
              if (!sortable) return <th key={key} scope="col" className={classes(cellClass, 'bg-table-heading font-bold whitespace-nowrap')}>{label}</th>
              const rank = sorts.findIndex((sort) => sort.key === key)
              const sort = sorts[rank]
              const arrow = sort ? (sort.descending ? '↓' : '↑') + (rank > 0 ? rank + 1 : '') : '↕'
              return (
                <th
                  key={key}
                  scope="col"
                  aria-sort={rank === 0 ? (sort.descending ? 'descending' : 'ascending') : 'none'}
                  className={classes(cellClass, 'bg-table-heading whitespace-nowrap')}
                >
                  <button type="button" className="inline-flex items-center gap-1.5 py-1 font-bold text-accent" onClick={() => onSort(key)}>
                    {label}
                    <span aria-hidden="true" className="text-[0.85em]">{arrow}</span>
                    {rank > 0 && <span className="sr-only">, sorted {ordinal(rank + 1)}, {sort.descending ? 'descending' : 'ascending'}</span>}
                  </button>
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody className="[&>tr:last-child>td]:border-b-0">
          {items.flatMap((item) => {
            const itemId = id(item)
            const open = openId === itemId
            const row = (
              <tr
                key={itemId}
                className={classes('even:bg-table-stripe', expandedRow && 'cursor-pointer hover:bg-hover')}
                onClick={expandedRow && ((event) => {
                  // Links and buttons in a cell do their own thing.
                  if ((event.target as Element).closest('a, button')) return
                  setOpenId(open ? undefined : itemId)
                })}
              >
                {columns.map((column) => (
                  <td key={column.key} className={classes(cellClass, bodyCellClass)}>{column.cell ? column.cell(item) : column.value(item)}</td>
                ))}
              </tr>
            )
            return expandedRow && open
              ? [row, <tr key={itemId + '/expanded'}><td colSpan={columns.length} className="border-b p-0">{expandedRow(item)}</td></tr>]
              : [row]
          })}
        </tbody>
      </table>
    </div>
  )
}

const ordinalRules = new Intl.PluralRules('en', { type: 'ordinal' })
const ordinalSuffixes: Partial<Record<Intl.LDMLPluralRule, string>> = { one: 'st', two: 'nd', few: 'rd' }

// 2nd, 3rd, 11th…
function ordinal(n: number) {
  return n + (ordinalSuffixes[ordinalRules.select(n)] ?? 'th')
}

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' })

function compare(lhs: string | number | undefined, rhs: string | number | undefined) {
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
