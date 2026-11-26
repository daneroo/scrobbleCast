import { useMemo } from 'react'
import type { ReactNode } from 'react'
import type { Field, List, Preset } from './query'

// The list's side of the journal: parsing, running, and the fields shown.
type JournalList<T, F extends Field<T>> = Pick<List<T, F>, 'parse' | 'run' | 'shown'>

// Whether a list has a journal: a preset that may be a lane, even one with
// no results now. Without one, an empty query shows every item instead.
export function hasLanes(presets: readonly Preset[]) {
  return presets.some(isLane)
}

function isLane(preset: Preset) {
  return !preset.excludeFromJournalLanes
}

// The journal's lanes: one per preset, in the presets' order, except those
// with `excludeFromJournalLanes` and those with no results. Each has its
// results' count, its first `laneLength` results as cards, and the fields
// its query shows.
export function journalLanes<T, F extends Field<T>>(list: JournalList<T, F>, presets: readonly Preset[], items: readonly T[], laneLength: number) {
  return presets.filter(isLane).map((preset) => {
    const query = list.parse(preset.query)
    const results = list.run(items, query)
    return { preset, count: results.length, cards: results.slice(0, laneLength), fields: list.shown(query) }
  }).filter(({ count }) => count > 0)
}

// A list's journal, shown when its query is empty: each lane has the
// preset's label, its count, hint and query, its cards scrolling sideways,
// and "See all →" to open its query. Nothing here knows books.
export function Journal<T, F extends Field<T>>({ list, presets, items, laneLength, id, card, onOpen }: {
  list: JournalList<T, F>
  presets: readonly Preset[]
  items: readonly T[]
  laneLength: number
  id: (item: T) => string
  // A card for one item, given the fields its preset's query shows.
  card: (item: T, fields: readonly F[]) => ReactNode
  onOpen: (query: string) => void
}) {
  const lanes = useMemo(() => journalLanes(list, presets, items, laneLength), [list, presets, items, laneLength])

  return (
    <div className="grid grid-cols-1 gap-9">
      {lanes.map(({ preset, count, cards, fields }) => (
        <section key={preset.label} aria-label={preset.label}>
          <div className="mb-3 flex items-baseline justify-between gap-4">
            <div className="min-w-0">
              <h2 className="text-xl font-bold">
                {preset.label} <span className="font-normal text-muted-foreground tabular-nums">{count.toLocaleString()}</span>
              </h2>
              <p className="text-sm text-muted-foreground">{preset.hint}</p>
              <p className="text-muted-foreground"><code className="text-xs wrap-anywhere">{preset.query}</code></p>
            </div>
            <button type="button" className="shrink-0 text-accent hover:underline" onClick={() => onOpen(preset.query)}>See all →</button>
          </div>
          {/* Scrolls sideways; its links take focus in turn, which scrolls them into view. The padding and scroll padding keep their focus outlines unclipped. */}
          <ul className="-mx-2 flex scroll-px-2 gap-3 overflow-x-auto p-2">
            {cards.map((item) => <li key={id(item)} className="w-28 shrink-0 sm:w-32">{card(item, fields)}</li>)}
          </ul>
        </section>
      ))}
    </div>
  )
}
