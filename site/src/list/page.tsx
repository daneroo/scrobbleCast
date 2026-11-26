import { Await } from '@tanstack/react-router'
import { useEffect, useMemo, useRef } from 'react'
import type { ReactNode } from 'react'
import { journalLaneLength, listPageSize, listPageStep } from '../config'
import type { Feed } from '../data/fetch'
import { Heading, Loading, Panel } from '../ui'
import { Journal, hasLanes } from './journal'
import type { List, Preset, Query } from './query'
import { QueryLine } from './query-line'
import { Scroll, useTopOnRestart } from './scroll'
import type { ShownField } from './shown'
import { useListQuery, useListView } from './state'
import { Table } from './table'
import type { Column } from './table'
import type { CardSize, View } from './view'
import { ViewSwitch } from './view-switch'

// The shared list page (glossary: List pages): books, podcasts and episodes
// each declare a definition once, beside their registry, and get the query
// line with its presets, the journal for an empty query, and a query's
// results in the three views. Nothing here knows what the items are.

export interface PageDefinition<T, F extends ShownField<T>> {
  // Its key for the kept query and the saved view ("books").
  name: string
  // The heading.
  title: string
  // For the count: ['book', 'books'].
  noun: readonly [one: string, many: string]
  placeholder: string
  list: List<T, F>
  presets: readonly Preset[]
  id: (item: T) => string
  // The table's lead column: the item itself, not a query field, so it has
  // no sort.
  lead: { label: string; cell: (item: T) => ReactNode }
  // A row click opens `panel` under it; `label` names its disclosure button
  // ("Details for Dune"). Without it, rows don't open.
  expand?: { panel: (item: T) => ReactNode; label: (item: T) => string }
  // An item as a card, a link to its page, given the fields shown: in a
  // results view of that size, or in a journal lane (small, and narrower).
  // Without it, there is no journal and no view switch: always the table,
  // whatever view is saved.
  card?: (item: T, fields: readonly F[], size: CardSize | 'lane') => ReactNode
}

// Cards across, by screen size: small 3, 5 or 7; large 3 or 4 (a narrow
// screen shows small cards instead, see `viewOn`).
const grids: Record<CardSize, string> = {
  small: 'grid grid-cols-3 gap-x-3 gap-y-5 sm:grid-cols-5 lg:grid-cols-7',
  large: 'grid grid-cols-3 gap-x-4 gap-y-6 lg:grid-cols-4',
}

// A list page: the heading, then `under`, a slot for what the list says of
// its items as a whole (the episodes' Window), the query line with the
// presets, then, once the feed has loaded, the journal for an empty query or
// the query's results. A list with no lanes (no card, or no preset that may
// be a lane) has no journal: an empty query shows every item, in the default
// sort with the default fields, and there is no "← Journal".
//
// Every new query text (typed, a preset, "See all", "← Journal", a header
// click) goes back to the top if the list's start has scrolled off screen.
// "See all" and "← Journal" go with the button pressed, so focus moves to the
// input, after that scroll.
export function ListPage<T, F extends ShownField<T>>({ page, items, under, journalAvailable = true }: {
  page: PageDefinition<T, F>
  items: Promise<Feed<T[]>>
  under?: ReactNode
  // A list can show results while its journal's data is still loading.
  journalAvailable?: boolean
}) {
  const [text, setText] = useListQuery(page.name)
  const [savedView, setView, narrow] = useListView(page.name)
  const view = page.card ? savedView : 'table'
  const card = page.card
  const journal = journalAvailable && card && hasLanes(page.presets)
  const query = useMemo(() => page.list.parse(text), [page.list, text])
  const start = useTopOnRestart<HTMLDivElement>(text)
  const input = useRef<HTMLInputElement>(null)
  const focusInput = useRef(false)
  useEffect(() => {
    if (!focusInput.current) return
    focusInput.current = false
    input.current?.focus()
  }, [text])

  function open(next: string) {
    focusInput.current = true
    setText(next)
  }

  return (
    <>
      <header className="mb-4">
        <Heading>{page.title}</Heading>
        {under}
      </header>
      <QueryLine
        text={text}
        onChange={setText}
        onJournal={journal ? () => open('') : undefined}
        help={page.list.help()}
        notUnderstood={query.notUnderstood}
        presets={page.presets}
        inputRef={input}
        placeholder={page.placeholder}
      />
      <div ref={start}>
        <Await promise={items} fallback={<Loading block />}>
          {({ data }) => journal && !query.tokens.length ? (
            <Journal
              list={page.list}
              presets={page.presets}
              items={data}
              laneLength={journalLaneLength}
              id={page.id}
              card={(item, fields) => card(item, fields, 'lane')}
              onOpen={open}
            />
          ) : (
            <Results
              page={page}
              items={data}
              query={query}
              view={view}
              narrow={narrow}
              onView={setView}
              onSort={(key) => setText(page.list.format(page.list.sortBy(query, key)))}
            />
          )}
        </Await>
      </div>
    </>
  )
}

// A query's results from one copy of the feed: the count, the fields shown,
// the view switch, and the results in that view, drawn as the reader scrolls.
function Results<T, F extends ShownField<T>>({ page, items, query, view, narrow, onView, onSort }: {
  page: PageDefinition<T, F>
  items: T[]
  query: Query
  view: View
  narrow: boolean
  onView: (view: View) => void
  onSort: (key: string) => void
}) {
  const { list, id, lead, expand, card, noun } = page
  const results = useMemo(() => list.run(items, query), [list, items, query])
  const fields = useMemo(() => list.shown(query), [list, query])
  const columns = useMemo<Column<T>[]>(() => [
    // Not a field's key, which starts with a letter.
    { key: ':lead', label: lead.label, sortable: false, value: () => undefined, cell: lead.cell },
    ...fields,
  ], [lead, fields])

  return (
    <>
      <p className="text-muted-foreground tabular-nums" aria-live="polite">
        {results.length.toLocaleString()} {results.length === 1 ? noun[0] : noun[1]}
      </p>
      <div className="mt-1 mb-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Showing {fields.map(({ label }) => label).join(' · ')}
          {' '}<span className="opacity-70">(from the query; <code>show:</code> to change)</span>
        </p>
        {card && <ViewSwitch view={view} narrow={narrow} onChange={onView} />}
      </div>
      {!results.length ? <Panel role="status">No matches.</Panel> : (
        <Scroll total={results.length} first={listPageSize} step={listPageStep} restart={query}>
          {(shown) => view === 'table' || !card
            ? <Table items={results.slice(0, shown)} columns={columns} id={id} sorts={query.order} onSort={onSort} expand={expand} />
            : (
              <ul className={grids[view]}>
                {results.slice(0, shown).map((item) => <li key={id(item)}>{card(item, fields, view)}</li>)}
              </ul>
            )}
        </Scroll>
      )}
    </>
  )
}
