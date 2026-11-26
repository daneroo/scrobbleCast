import type { ReactNode } from 'react'
import { day } from '../format'
import type { Field } from './query'

// A field a list shows: a query keyword, with its table cell and its short
// line under a card. Without a cell, the table shows its plain value; without
// a short line, cards never show it.
export interface ShownField<T> extends Field<T> {
  cell?: (item: T) => ReactNode
  // `null` or `undefined` when it has nothing to say for this item.
  short?: (item: T) => ReactNode
}

// Filter and sort on the feed's time and show its day in the table.
export function dateField<T>(field: Pick<ShownField<T>, 'key' | 'label' | 'note' | 'example'>, date: (item: T) => string | undefined): ShownField<T> {
  return { ...field, kind: 'date', value: (item) => date(item) || undefined, cell: (item) => day(date(item) ?? '') }
}

// A card's short lines: those of `fields` that have something to say, in
// their order, at most `most`, each with its field's key.
export function shortLines<T>(item: T, fields: readonly ShownField<T>[], most: number) {
  const lines: [key: string, line: ReactNode][] = []
  for (const field of fields) {
    if (lines.length >= most) break
    const line = field.short?.(item)
    if (line !== null && line !== undefined) lines.push([field.key, line])
  }
  return lines
}
