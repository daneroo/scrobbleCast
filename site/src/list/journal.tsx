import { useMemo } from 'react'
import type { ReactNode } from 'react'
import type { Field, List, Preset } from './query'

// A list's journal, shown when its query is empty: one lane per preset, in
// the presets' order, except those with `excludeFromJournalLanes`. A lane has
// the preset's label, its count, hint and query, its first `length` results
// as cards scrolling sideways, and "See all →" to open its query. A preset
// with no results has no lane. Nothing here knows books.
export function Journal<T, F extends Field<T>>({ list, presets, items, length, id, card, onOpen }: {
  list: Pick<List<T, F>, 'parse' | 'run' | 'shown'>
  presets: readonly Preset[]
  items: readonly T[]
  length: number
  id: (item: T) => string
  // A card for one item, given the fields its preset's query shows.
  card: (item: T, fields: readonly F[]) => ReactNode
  onOpen: (query: string) => void
}) {
  const lanes = useMemo(() => presets.filter((preset) => !preset.excludeFromJournalLanes).map((preset) => {
    const query = list.parse(preset.query)
    return { preset, results: list.run(items, query), fields: list.shown(query) }
  }).filter(({ results }) => results.length > 0), [list, presets, items])

  return (
    <div className="grid grid-cols-1 gap-9">
      {lanes.map(({ preset, results, fields }) => (
        <section key={preset.label} aria-label={preset.label}>
          <div className="mb-3 flex items-baseline justify-between gap-4">
            <div className="min-w-0">
              <h2 className="text-xl font-bold">
                {preset.label} <span className="font-normal text-muted-foreground tabular-nums">{results.length.toLocaleString()}</span>
              </h2>
              <p className="truncate text-sm text-muted-foreground">{preset.hint} · <code className="text-xs">{preset.query}</code></p>
            </div>
            <button type="button" className="shrink-0 text-accent hover:underline" onClick={() => onOpen(preset.query)}>See all →</button>
          </div>
          {/* Scrolls sideways; its links take focus in turn, which scrolls them into view. The padding and scroll padding keep their focus outlines unclipped. */}
          <ul className="-mx-2 flex scroll-px-2 gap-3 overflow-x-auto p-2">
            {results.slice(0, length).map((item) => <li key={id(item)} className="w-28 shrink-0 sm:w-32">{card(item, fields)}</li>)}
          </ul>
        </section>
      ))}
    </div>
  )
}
