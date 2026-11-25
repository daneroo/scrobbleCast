// PROTOTYPE (branch prototype/layout, never merges).
// Four variants of the books list, switchable via `?variant=`, on the existing
// `/books` route and its feed:
//   A  premade views (tabs) over a dense table
//   B  general facets + sort-by-any-field over cover cards
//   C  reading journal: lanes of premade queries, rich list on "See all"
//   D  one query line (`shelf:on-deck sort:-avg`), presets fill it, compact list
//   S  synthesis: D's query line, C's journal when empty, results as A's
//      table, C's small cards or B's large cards; fields follow the query
//   0  the current page, for comparison
import { Await, Link, useNavigate, useSearch } from '@tanstack/react-router'
import { useState } from 'react'
import type { ReactNode } from 'react'
import type { Book } from './data/books'
import type { Feed } from './data/fetch'
import { day } from './format'
import { Books } from './pages'
import { PrototypeSwitcher } from './prototype-switcher'
import type { Variant } from './prototype-switcher'
import { search } from './search'
import { Table } from './table'
import type { Column } from './table'
import { Button, Field, Heading, Panel, classes, control } from './ui'

type Books = Promise<Feed<Book[]>>

const variants: Variant[] = [
  { key: 'S', name: 'Synthesis' },
  { key: 'A', name: 'Views + table' },
  { key: 'B', name: 'Facets + covers' },
  { key: 'C', name: 'Reading journal' },
  { key: 'D', name: 'Query line' },
  { key: '0', name: 'Current page' },
]

export function BooksPrototype({ books }: { books: Books }) {
  const { variant = 'S' } = useSearch({ from: '/books' })
  const navigate = useNavigate({ from: '/books' })
  if (!import.meta.env.DEV) return <Books books={books} />
  return (
    <>
      {variant === 'S' && <VariantS books={books} />}
      {variant === 'A' && <VariantA books={books} />}
      {variant === 'B' && <VariantB books={books} />}
      {variant === 'C' && <VariantC books={books} />}
      {variant === 'D' && <VariantD books={books} />}
      {variant === '0' && <Books books={books} />}
      <div className="h-20" />
      <PrototypeSwitcher variants={variants} current={variant} onChange={(key) => void navigate({ search: { variant: key }, replace: true })} />
    </>
  )
}

// ---------------------------------------------------------------- shared bits

const bookKeys = ['title', 'authorName', 'bookDescription']
const thisYear = String(new Date().getFullYear())
const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' })

const shelfLabels: Record<string, string> = {
  'currently-reading': 'Reading', 'to-read': 'To read', 'on-deck': 'On deck', 'did-not-finish': 'DNF', read: 'Read',
}
const shelfName = (shelf: string) => shelfLabels[shelf] ?? shelf

// `._SY75_` → `._SY300_` (199×300); no suffix gives the 315×475 original.
const coverUrl = (book: Book, size = 'SY300') => book.bookImageURL.replace(/\._S[XY]\d+_\./, `._${size}_.`)

// The last "NN%" or "page N NN%" row of the timeline (not another edition's).
function progress(book: Book): number | undefined {
  let found: number | undefined
  for (const { event } of book.timeline) {
    if (/Edition\)$/.test(event)) continue
    const match = /(\d+(?:\.\d+)?)%$/.exec(event)
    if (match) found = Number(match[1])
  }
  return found
}

const avg = (book: Book) => Number(book.averageRating)
const gap = (book: Book) => book.userRating ? Math.round(10 * (book.userRating - avg(book))) / 10 : undefined

type Value = string | number
interface FieldDef { label: string; value: (book: Book) => Value; render?: (book: Book) => ReactNode }

// Every sortable field; `''` is "no value" and always sorts last.
const fields = {
  read: { label: 'Last read', value: (b) => b.userLastReadAt, render: (b) => day(b.userLastReadAt) },
  first: { label: 'First read', value: (b) => b.userFirstReadAt, render: (b) => day(b.userFirstReadAt) },
  mine: { label: 'Mine', value: (b) => b.userRating || '', render: (b) => <Stars value={b.userRating} /> },
  avg: { label: 'Avg', value: (b) => avg(b) || '', render: (b) => b.averageRating },
  gap: { label: 'Me − avg', value: (b) => gap(b) ?? '', render: (b) => signed(gap(b)) },
  pages: { label: 'Pages', value: (b) => Number(b.numPages) || '' },
  published: { label: 'Published', value: (b) => b.bookPublished, render: (b) => b.bookPublished.slice(0, 4) || '—' },
  added: { label: 'Added', value: (b) => b.userAddedAt, render: (b) => day(b.userAddedAt) },
  updated: { label: 'Updated', value: (b) => b.userUpdatedAt, render: (b) => day(b.userUpdatedAt) },
  reads: { label: 'Reads', value: (b) => b.userReadCount || '' },
  shelf: { label: 'Shelf', value: (b) => shelfName(b.userShelf), render: (b) => <ShelfBadge shelf={b.userShelf} /> },
  progress: { label: 'Progress', value: (b) => progress(b) ?? '', render: (b) => <Progress value={progress(b)} /> },
  title: { label: 'Title', value: (b) => b.title },
  author: { label: 'Author', value: (b) => b.authorName },
} satisfies Record<string, FieldDef>
type FieldKey = keyof typeof fields

function compareBy(key: FieldKey, descending: boolean) {
  const { value } = fields[key] as FieldDef
  return (a: Book, b: Book) => {
    const x = value(a)
    const y = value(b)
    if (x === '' || y === '') return x === y ? 0 : x === '' ? 1 : -1
    const c = typeof x === 'number' && typeof y === 'number' ? x - y : collator.compare(String(x), String(y))
    return descending ? -c : c
  }
}

function then(...comparisons: ((a: Book, b: Book) => number)[]) {
  return (a: Book, b: Book) => {
    for (const compare of comparisons) {
      const c = compare(a, b)
      if (c) return c
    }
    return 0
  }
}

// Premade views tailored to this reader. Each: a filter, an order, and the
// columns that matter for it. D expresses the same views as query text.
interface Preset {
  key: string
  label: string
  hint: string
  filter: (book: Book) => boolean
  sort: (a: Book, b: Book) => number
  columns: FieldKey[]
  query: string
}

const presets: Preset[] = [
  {
    key: 'now', label: 'Reading now', hint: 'On the currently-reading shelf, latest activity first',
    filter: (b) => b.userShelf === 'currently-reading', sort: compareBy('updated', true),
    columns: ['progress', 'pages', 'avg', 'updated'], query: 'shelf:currently-reading sort:-updated',
  },
  {
    key: 'loved', label: 'Recent 5★', hint: 'My five-star books, most recently read first',
    filter: (b) => b.userRating >= 5, sort: compareBy('read', true),
    columns: ['avg', 'reads', 'pages', 'read'], query: 'rating:5 sort:-read',
  },
  {
    key: 'deck', label: 'On deck, best first', hint: 'On-deck books by Goodreads average rating',
    filter: (b) => b.userShelf === 'on-deck', sort: then(compareBy('avg', true), compareBy('added', true)),
    columns: ['avg', 'pages', 'published', 'added'], query: 'shelf:on-deck sort:-avg,-added',
  },
  {
    key: 'quick', label: 'Quick next read', hint: 'On deck, under 300 pages, best average first',
    filter: (b) => b.userShelf === 'on-deck' && Number(b.numPages) > 0 && Number(b.numPages) < 300, sort: compareBy('avg', true),
    columns: ['pages', 'avg', 'published', 'added'], query: 'shelf:on-deck pages:<300 sort:-avg,pages',
  },
  {
    key: 'year', label: `Read in ${thisYear}`, hint: `Finished in ${thisYear}, latest first`,
    filter: (b) => b.userLastReadAt.startsWith(thisYear), sort: compareBy('read', true),
    columns: ['mine', 'avg', 'pages', 'read'], query: `year:${thisYear} sort:-read`,
  },
  {
    key: 'rereads', label: 'Re-reads', hint: 'Books I read more than once',
    filter: (b) => b.userReadCount >= 2, sort: then(compareBy('reads', true), compareBy('read', true)),
    columns: ['reads', 'mine', 'first', 'read'], query: 'reads:>=2 sort:-reads,-read',
  },
  {
    key: 'outlier', label: 'Me vs. everyone', hint: 'Where my rating and the average disagree by 0.8 or more',
    filter: (b) => Math.abs(gap(b) ?? 0) >= 0.8,
    sort: (a, b) => Math.abs(gap(b) ?? 0) - Math.abs(gap(a) ?? 0),
    columns: ['mine', 'avg', 'gap', 'read'], query: 'gap:>=0.8 sort:-gap',
  },
  {
    key: 'gems', label: 'To-read gems', hint: 'To-read books rated 4.3 or more on average',
    filter: (b) => b.userShelf === 'to-read' && avg(b) >= 4.3, sort: compareBy('avg', true),
    columns: ['avg', 'pages', 'published', 'added'], query: 'shelf:to-read avg:>=4.3 sort:-avg',
  },
  {
    key: 'waiting', label: 'Longest waiting', hint: 'To-read and on-deck books, oldest added first',
    filter: (b) => b.userShelf === 'to-read' || b.userShelf === 'on-deck', sort: compareBy('added', false),
    columns: ['shelf', 'avg', 'pages', 'added'], query: 'shelf:to-read,on-deck sort:added',
  },
  {
    key: 'unrated', label: 'Read, unrated', hint: 'Read but never rated, latest first',
    filter: (b) => b.userShelf === 'read' && !b.userRating, sort: compareBy('read', true),
    columns: ['avg', 'pages', 'reads', 'read'], query: 'shelf:read rating:0 sort:-read',
  },
  {
    key: 'all', label: 'Everything', hint: 'All books, latest activity first',
    filter: () => true, sort: compareBy('updated', true),
    columns: ['shelf', 'mine', 'avg', 'read'], query: 'sort:-updated',
  },
]

function Stars({ value }: { value: number }) {
  if (!value) return <span className="text-muted-foreground">—</span>
  const n = Math.round(value)
  return (
    <span className="whitespace-nowrap tracking-tight" aria-label={`${value} of 5`} title={`${value} of 5`}>
      <span className="text-accent">{'★'.repeat(n)}</span>
      <span className="text-muted-foreground opacity-50">{'★'.repeat(5 - n)}</span>
    </span>
  )
}

function ShelfBadge({ shelf }: { shelf: string }) {
  return <span className="inline-block rounded-full border px-2 py-0.5 text-xs whitespace-nowrap text-muted-foreground">{shelfName(shelf)}</span>
}

function Progress({ value }: { value: number | undefined }) {
  if (value === undefined) return <span className="text-muted-foreground">—</span>
  return (
    <span className="inline-flex items-center gap-2">
      <span className="h-1.5 w-16 overflow-hidden rounded-full bg-table-stripe ring-1 ring-border">
        <span className="block h-full bg-primary" style={{ width: `${value}%` }} />
      </span>
      <span className="tabular-nums">{Math.round(value)}%</span>
    </span>
  )
}

function signed(value: number | undefined) {
  return value === undefined ? '—' : (value > 0 ? '+' : '') + value.toFixed(1)
}

function Cover({ book, className, size }: { book: Book; className?: string; size?: string }) {
  return <img src={coverUrl(book, size)} alt="" loading="lazy" className={classes('aspect-[2/3] rounded-sm bg-artwork object-cover shadow-sm', className)} />
}

function BookLink({ book, className, children }: { book: Book; className?: string; children?: ReactNode }) {
  return <Link to="/books/$bookId" params={{ bookId: book.bookId }} className={className}>{children ?? book.title}</Link>
}

function Loaded({ books, children }: { books: Books; children: (data: Book[]) => ReactNode }) {
  return <Await promise={books} fallback={<Panel role="status">Loading…</Panel>}>{({ data }) => children(data)}</Await>
}

function Search({ value, onChange, label = 'Search books' }: { value: string; onChange: (value: string) => void; label?: string }) {
  return (
    <Field label={label} className="min-w-[min(100%,16rem)] flex-1">
      <input type="search" className={control} value={value} onChange={(event) => onChange(event.target.value)} />
    </Field>
  )
}

function Count({ n }: { n: number }) {
  return <p className="text-muted-foreground tabular-nums">{n.toLocaleString()} {n === 1 ? 'book' : 'books'}</p>
}

// ------------------------------------------------- A: premade views + table

function VariantA({ books }: { books: Books }) {
  const [key, setKey] = useState('now')
  const [query, setQuery] = useState('')
  const preset = presets.find((p) => p.key === key) ?? presets[0]
  const columns: Column<Book>[] = [
    {
      label: 'Book',
      value: (b) => b.title,
      render: (b) => (
        <span className="flex items-start gap-3">
          <Cover book={b} size="SY75" className="w-9 shrink-0" />
          <span className="grid">
            <BookLink book={b} className="font-semibold" />
            <span className="text-sm text-muted-foreground">{b.authorName}</span>
          </span>
        </span>
      ),
    },
    ...preset.columns.map((k) => fields[k] as FieldDef),
  ]
  return (
    <Loaded books={books}>
      {(data) => {
        const results = search(data, bookKeys, query).filter(preset.filter).toSorted(preset.sort)
        return (
          <>
            <header className="mb-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
              <Heading>Books</Heading>
              <Count n={results.length} />
            </header>
            <nav aria-label="Views" className="-mx-1 mb-4 flex gap-1.5 overflow-x-auto px-1 pb-1">
              {presets.map((p) => {
                const n = data.filter(p.filter).length
                const active = p.key === preset.key
                return (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => setKey(p.key)}
                    className={classes(
                      'shrink-0 rounded-full border px-3.5 py-1.5 text-sm whitespace-nowrap',
                      active ? 'border-primary bg-primary text-primary-foreground' : 'bg-card hover:bg-hover',
                    )}
                  >
                    {p.label} <span className={classes('tabular-nums', !active && 'text-muted-foreground')}>{n}</span>
                  </button>
                )
              })}
            </nav>
            <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
              <p className="text-muted-foreground">{preset.hint}</p>
              <div className="w-full sm:w-72"><Search value={query} onChange={setQuery} label="Search this view" /></div>
            </div>
            {/* Keyed by view so a column sort from one view doesn't carry over. */}
            <Table key={preset.key} items={results} columns={columns} id={(b) => b.bookId} limit={200} />
          </>
        )
      }}
    </Loaded>
  )
}

// ------------------------------------------- B: facets + sort + cover cards

interface FacetOption { key: string; label: string; test: (b: Book) => boolean }
interface Facet { key: string; label: string; options: FacetOption[] }

function facetsFor(data: Book[]): Facet[] {
  const years = [...new Set(data.map((b) => b.userLastReadAt.slice(0, 4)).filter(Boolean))].sort().reverse()
  const recent = years.slice(0, 6)
  const pages = (b: Book) => Number(b.numPages)
  return [
    {
      key: 'shelf', label: 'Shelf',
      options: ['currently-reading', 'on-deck', 'to-read', 'read', 'did-not-finish'].map((s) => ({ key: s, label: shelfName(s), test: (b) => b.userShelf === s })),
    },
    {
      key: 'mine', label: 'My rating',
      options: [
        { key: '5', label: '★★★★★', test: (b) => b.userRating >= 4.75 },
        { key: '4', label: '★★★★', test: (b) => b.userRating >= 3.75 && b.userRating < 4.75 },
        { key: '3', label: '★★★', test: (b) => b.userRating >= 2.75 && b.userRating < 3.75 },
        { key: 'low', label: '★★ or less', test: (b) => b.userRating > 0 && b.userRating < 2.75 },
        { key: '0', label: 'Unrated', test: (b) => !b.userRating },
      ],
    },
    {
      key: 'avg', label: 'Average rating',
      options: [
        { key: '45', label: '4.5 and up', test: (b) => avg(b) >= 4.5 },
        { key: '40', label: '4.0 – 4.4', test: (b) => avg(b) >= 4 && avg(b) < 4.5 },
        { key: '35', label: '3.5 – 3.9', test: (b) => avg(b) >= 3.5 && avg(b) < 4 },
        { key: 'low', label: 'Under 3.5', test: (b) => avg(b) < 3.5 },
      ],
    },
    {
      key: 'pages', label: 'Length',
      options: [
        { key: 's', label: 'Under 250 pages', test: (b) => pages(b) < 250 },
        { key: 'm', label: '250 – 449', test: (b) => pages(b) >= 250 && pages(b) < 450 },
        { key: 'l', label: '450 – 699', test: (b) => pages(b) >= 450 && pages(b) < 700 },
        { key: 'xl', label: '700 and up', test: (b) => pages(b) >= 700 },
      ],
    },
    {
      key: 'year', label: 'Read in',
      options: [
        ...recent.map((y) => ({ key: y, label: y, test: (b: Book) => b.userLastReadAt.startsWith(y) })),
        { key: 'older', label: `Before ${recent.at(-1)}`, test: (b) => !!b.userLastReadAt && b.userLastReadAt.slice(0, 4) < (recent.at(-1) ?? '') },
      ],
    },
  ]
}

const sortChoices: FieldKey[] = ['read', 'mine', 'avg', 'gap', 'pages', 'published', 'added', 'updated', 'reads', 'title', 'author']

function VariantB({ books }: { books: Books }) {
  const [query, setQuery] = useState('')
  const [picked, setPicked] = useState<Record<string, string[]>>({ shelf: ['read'] })
  const [sortKey, setSortKey] = useState<FieldKey>('read')
  const [descending, setDescending] = useState(true)
  const [limit, setLimit] = useState(48)

  const toggle = (facet: string, option: string) => {
    setLimit(48)
    setPicked((p) => {
      const now = p[facet] ?? []
      return { ...p, [facet]: now.includes(option) ? now.filter((o) => o !== option) : [...now, option] }
    })
  }

  return (
    <Loaded books={books}>
      {(data) => {
        const facets = facetsFor(data)
        const matched = search(data, bookKeys, query)
        const passes = (b: Book, except?: string) => facets.every((f) => {
          const on = picked[f.key] ?? []
          return f.key === except || !on.length || f.options.some((o) => on.includes(o.key) && o.test(b))
        })
        const results = matched.filter((b) => passes(b)).toSorted(compareBy(sortKey, descending))
        const active = Object.values(picked).flat().length

        const sidebar = (
          <div className="grid gap-5">
            {facets.map((f) => (
              <fieldset key={f.key}>
                <legend className="mb-1.5 text-sm font-bold">{f.label}</legend>
                {f.options.map((o) => {
                  const n = matched.filter((b) => passes(b, f.key) && o.test(b)).length
                  const on = (picked[f.key] ?? []).includes(o.key)
                  return (
                    <label key={o.key} className={classes('flex items-center gap-2 rounded px-1 py-1 text-sm hover:bg-hover', !n && !on && 'opacity-40')}>
                      <input type="checkbox" className="size-4 accent-primary" checked={on} onChange={() => toggle(f.key, o.key)} />
                      <span className="flex-1">{o.label}</span>
                      <span className="text-muted-foreground tabular-nums">{n}</span>
                    </label>
                  )
                })}
              </fieldset>
            ))}
            {active > 0 && <button type="button" className="justify-self-start text-sm text-accent underline" onClick={() => setPicked({})}>Clear {active} filters</button>}
          </div>
        )

        return (
          <>
            <header className="mb-5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
              <Heading>Books</Heading>
              <Count n={results.length} />
            </header>
            <div className="grid gap-6 lg:grid-cols-[14rem_1fr]">
              <aside>
                <details className="rounded-lg border bg-card p-4 lg:hidden">
                  <summary className="font-semibold">Filters{active ? ` (${active})` : ''}</summary>
                  <div className="mt-4">{sidebar}</div>
                </details>
                <div className="hidden lg:block">{sidebar}</div>
              </aside>
              <div className="min-w-0">
                <div className="mb-5 flex flex-wrap items-end gap-3">
                  <Search value={query} onChange={(v) => { setQuery(v); setLimit(48) }} />
                  <Field label="Sort by">
                    <select className={classes(control, 'min-w-40')} value={sortKey} onChange={(e) => setSortKey(e.target.value as FieldKey)}>
                      {sortChoices.map((k) => <option key={k} value={k}>{fields[k].label}</option>)}
                    </select>
                  </Field>
                  <button type="button" className={classes(control, 'w-auto')} onClick={() => setDescending(!descending)} aria-label="Sort direction">
                    {descending ? '↓ High → low' : '↑ Low → high'}
                  </button>
                </div>
                {!results.length ? <Panel role="status">No matches.</Panel> : (
                  <ul className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 xl:grid-cols-4">
                    {results.slice(0, limit).map((b) => (
                      <li key={b.bookId}>
                        <BookLink book={b} className="group grid gap-2 text-inherit no-underline">
                          <Cover book={b} className="w-full transition group-hover:shadow-card" />
                          <span className="line-clamp-2 leading-snug font-semibold group-hover:underline">{b.title}</span>
                          <span className="-mt-1.5 truncate text-sm text-muted-foreground">{b.authorName}</span>
                          <span className="flex items-center justify-between gap-2 text-sm">
                            <Stars value={b.userRating} />
                            <span className="text-muted-foreground tabular-nums">avg {b.averageRating}</span>
                          </span>
                          <span className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                            <ShelfBadge shelf={b.userShelf} />
                            <span className="tabular-nums">{sortKey === 'mine' || sortKey === 'avg' ? day(b.userLastReadAt) : (fields[sortKey] as FieldDef).render?.(b) ?? fields[sortKey].value(b)}</span>
                          </span>
                        </BookLink>
                      </li>
                    ))}
                  </ul>
                )}
                {limit < results.length && (
                  <div className="mt-6 flex items-center gap-4">
                    <Button onClick={() => setLimit(limit + 48)}>Show more</Button>
                    <span className="text-muted-foreground">{limit} of {results.length}</span>
                  </div>
                )}
              </div>
            </div>
          </>
        )
      }}
    </Loaded>
  )
}

// --------------------------------------------- C: reading journal of lanes

const lanes = ['loved', 'year', 'deck', 'quick', 'gems', 'rereads', 'outlier', 'waiting']

function VariantC({ books }: { books: Books }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState<string>()
  return (
    <Loaded books={books}>
      {(data) => {
        const opened = presets.find((p) => p.key === open)
        if (query.trim() || opened) {
          const results = query.trim() ? search(data, bookKeys, query) : data.filter(opened!.filter).toSorted(opened!.sort)
          return (
            <>
              <header className="mb-5 grid gap-2">
                <button type="button" className="justify-self-start text-accent" onClick={() => { setOpen(undefined); setQuery('') }}>← Journal</button>
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
                  <Heading>{opened && !query.trim() ? opened.label : 'Search'}</Heading>
                  <Count n={results.length} />
                </div>
                {opened && !query.trim() && <p className="text-muted-foreground">{opened.hint}</p>}
              </header>
              <div className="mb-6 max-w-xl"><Search value={query} onChange={setQuery} /></div>
              {!results.length ? <Panel role="status">No matches.</Panel> : (
                <ol className="grid gap-px overflow-hidden rounded-lg border bg-border">
                  {results.slice(0, 100).map((b) => <RichRow key={b.bookId} book={b} />)}
                </ol>
              )}
            </>
          )
        }
        const reading = data.filter(presets[0].filter).toSorted(presets[0].sort)
        return (
          <>
            <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
              <Heading>Books</Heading>
              <div className="w-full sm:w-80"><Search value={query} onChange={setQuery} /></div>
            </header>
            <section className="mb-10">
              <h2 className="mb-3 text-xl font-bold">Reading now <span className="font-normal text-muted-foreground">{reading.length}</span></h2>
              <ul className="grid gap-3 sm:grid-cols-2">
                {reading.map((b) => (
                  <li key={b.bookId} className="flex gap-4 rounded-xl border bg-card p-3">
                    <Cover book={b} className="w-16 shrink-0" />
                    <div className="grid min-w-0 content-start gap-1">
                      <BookLink book={b} className="line-clamp-2 font-semibold" />
                      <span className="truncate text-sm text-muted-foreground">{b.authorName} · {b.numPages} p</span>
                      <Progress value={progress(b)} />
                    </div>
                  </li>
                ))}
              </ul>
            </section>
            {lanes.map((key) => {
              const p = presets.find((x) => x.key === key)!
              const items = data.filter(p.filter).toSorted(p.sort)
              if (!items.length) return null
              return (
                <section key={key} className="mb-9">
                  <div className="mb-3 flex items-baseline justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-bold">{p.label} <span className="font-normal text-muted-foreground">{items.length}</span></h2>
                      <p className="text-sm text-muted-foreground">{p.hint}</p>
                    </div>
                    <button type="button" className="shrink-0 text-accent" onClick={() => setOpen(key)}>See all →</button>
                  </div>
                  <ul className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-2">
                    {items.slice(0, 12).map((b) => (
                      <li key={b.bookId} className="w-28 shrink-0 sm:w-32">
                        <BookLink book={b} className="group grid gap-1.5 text-inherit no-underline">
                          <Cover book={b} className="w-full" />
                          <span className="line-clamp-2 text-sm leading-snug font-semibold group-hover:underline">{b.title}</span>
                          <span className="text-xs text-muted-foreground">{laneNote(key, b)}</span>
                        </BookLink>
                      </li>
                    ))}
                  </ul>
                </section>
              )
            })}
          </>
        )
      }}
    </Loaded>
  )
}

// The one fact under a cover that explains why it's in its lane.
function laneNote(key: string, b: Book): ReactNode {
  switch (key) {
    case 'loved': case 'year': return day(b.userLastReadAt)
    case 'deck': case 'gems': return `avg ${b.averageRating}`
    case 'quick': return `${b.numPages} p · avg ${b.averageRating}`
    case 'rereads': return `read ${b.userReadCount}×`
    case 'outlier': return <>{'★'.repeat(Math.round(b.userRating))} vs {b.averageRating}</>
    case 'waiting': return `since ${b.userAddedAt.slice(0, 7)}`
    default: return b.authorName
  }
}

function RichRow({ book: b }: { book: Book }) {
  const bits = [
    shelfName(b.userShelf),
    b.numPages && `${b.numPages} pages`,
    b.bookPublished && `published ${b.bookPublished.slice(0, 4)}`,
    b.userReadCount > 1 && `read ${b.userReadCount}×`,
    b.userLastReadAt && `last read ${day(b.userLastReadAt)}`,
    !b.userLastReadAt && `added ${day(b.userAddedAt)}`,
  ].filter(Boolean)
  return (
    <li className="flex gap-4 bg-card p-4">
      <Cover book={b} className="w-16 shrink-0 self-start sm:w-20" />
      <div className="grid min-w-0 content-start gap-1">
        <BookLink book={b} className="text-lg leading-snug font-semibold" />
        <span className="text-muted-foreground">{b.authorName}</span>
        <span className="flex flex-wrap items-center gap-x-3 text-sm">
          <Stars value={b.userRating} />
          <span className="text-muted-foreground">avg {b.averageRating}</span>
          {b.userShelf === 'currently-reading' && <Progress value={progress(b)} />}
        </span>
        <span className="text-sm text-muted-foreground">{bits.join(' · ')}</span>
        {b.userReview
          ? <blockquote className="mt-1 line-clamp-3 border-l-2 border-primary pl-3 text-sm italic">{b.userReview}</blockquote>
          : b.bookDescription && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{b.bookDescription}</p>}
        {b.userTags.length > 0 && <span className="text-sm">{b.userTags.map((t) => `#${t}`).join(' ')}</span>}
      </div>
    </li>
  )
}

// ------------------------------------------------------ D: one query line

// Filter keys: what each compares (numbers compare with > < >= <= =).
const numericKeys: Record<string, (b: Book) => number | undefined> = {
  rating: (b) => b.userRating,
  avg: (b) => avg(b),
  gap: (b) => gap(b),
  pages: (b) => Number(b.numPages) || undefined,
  reads: (b) => b.userReadCount,
  year: (b) => Number(b.userLastReadAt.slice(0, 4)) || undefined,
  published: (b) => Number(b.bookPublished.slice(0, 4)) || undefined,
}
const sortAliases: Record<string, FieldKey> = { rating: 'mine', year: 'read' }

interface Parsed {
  text: string
  filters: { token: string; test: (b: Book) => boolean }[]
  sort?: { key: FieldKey; descending: boolean } // the primary sort
  sorts: { key: FieldKey; descending: boolean }[] // all of them, in order
  unknown: string[]
  shelves: string[] // full shelf names the query keeps
  mentioned: FieldKey[] // fields the filters compare
  shown: FieldKey[] // `show:` override
}

const allShelves = ['currently-reading', 'on-deck', 'to-read', 'read', 'did-not-finish']
const filterFields: Record<string, FieldKey[]> = {
  rating: ['mine'], avg: ['avg'], gap: ['mine', 'avg', 'gap'], pages: ['pages'], reads: ['reads'], year: ['read'], published: ['published'],
}
const fieldAlias = (name: string) => (sortAliases[name] ?? name) as FieldKey

function parse(query: string): Parsed {
  const parsed: Parsed = { text: '', filters: [], unknown: [], shelves: [], mentioned: [], shown: [], sorts: [] }
  const words: string[] = []
  for (const token of query.trim().split(/\s+/).filter(Boolean)) {
    const match = /^(\w+):(.+)$/.exec(token)
    if (!match) { words.push(token); continue }
    const [, key, raw] = match
    if (key === 'sort') {
      // `sort:-avg,-added`: each field its own direction; the last `sort:` wins.
      parsed.sorts = []
      for (const part of raw.split(',')) {
        const field = fieldAlias(part.replace(/^-/, ''))
        if (field in fields && !parsed.sorts.some((s) => s.key === field)) parsed.sorts.push({ key: field, descending: part.startsWith('-') })
        else if (!(field in fields)) parsed.unknown.push(`sort:${part}`)
      }
      parsed.sort = parsed.sorts[0]
    } else if (key === 'show') {
      for (const name of raw.split(',')) {
        if (fieldAlias(name) in fields) parsed.shown.push(fieldAlias(name))
        else parsed.unknown.push(`show:${name}`)
      }
    } else if (key === 'shelf') {
      // Exact name, else any shelf containing it (`deck`): `read` isn't `currently-reading`.
      const shelves = raw.split(',').flatMap((s) => allShelves.includes(s) ? [s] : allShelves.filter((full) => full.includes(s)))
      parsed.shelves.push(...shelves)
      parsed.filters.push({ token, test: (b) => shelves.includes(b.userShelf) })
    } else if (key === 'tag') {
      parsed.filters.push({ token, test: (b) => b.userTags.includes(raw) })
    } else if (key in numericKeys) {
      const m = /^(>=|<=|>|<|=)?(-?\d+(?:\.\d+)?)$/.exec(raw)
      if (!m) { parsed.unknown.push(token); continue }
      const [, op = '=', num] = m
      // A field every result shares (rating:5) isn't worth a column.
      if (!(op === '=' && (key === 'rating' || key === 'reads'))) parsed.mentioned.push(...filterFields[key])
      const n = Number(num)
      const get = numericKeys[key]
      const test = (b: Book) => {
        const v = get(b) ?? (key === 'rating' || key === 'reads' ? 0 : undefined)
        if (v === undefined) return false
        if (key === 'gap' && op === '>=') return Math.abs(v) >= n // gap:>=0.8 means "either way"
        return op === '>=' ? v >= n : op === '<=' ? v <= n : op === '>' ? v > n : op === '<' ? v < n : v === n
      }
      parsed.filters.push({ token, test })
    } else parsed.unknown.push(token)
  }
  parsed.text = words.join(' ')
  return parsed
}

function VariantD({ books }: { books: Books }) {
  const [query, setQuery] = useState(presets[1].query)
  const [openId, setOpenId] = useState<string>()
  const [limit, setLimit] = useState(60)
  const parsed = parse(query)
  const sortKey = parsed.sort?.key ?? 'updated'
  return (
    <Loaded books={books}>
      {(data) => {
        let results = search(data, bookKeys, parsed.text).filter((b) => parsed.filters.every((f) => f.test(b)))
        if (parsed.sort || !parsed.text) results = results.toSorted(compareBy(sortKey, parsed.sort?.descending ?? true))
        return (
          <>
            <header className="mb-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
              <Heading>Books</Heading>
              <Count n={results.length} />
            </header>
            <label className="grid gap-1.5">
              <span className="sr-only">Query</span>
              <input
                type="search"
                spellCheck={false}
                className={classes(control, 'font-mono text-base')}
                value={query}
                onChange={(e) => { setQuery(e.target.value); setLimit(60) }}
              />
            </label>
            <p className="mt-2 text-xs text-muted-foreground">
              Words search title, author, description. Filters: <code>shelf:on-deck,to-read</code> <code>rating:&gt;=4</code> <code>avg:&gt;=4.3</code> <code>pages:&lt;300</code> <code>year:2025</code> <code>reads:&gt;=2</code> <code>gap:&gt;=0.8</code> <code>published:&lt;1950</code> <code>tag:long-term</code>. Order: <code>sort:-avg</code> (minus = high first) by read, rating, avg, gap, pages, published, added, updated, reads, title, author.
              {parsed.unknown.length > 0 && <> Not understood: <strong className="text-foreground line-through">{parsed.unknown.join(' ')}</strong></>}
            </p>
            <div className="mt-3 mb-5 flex flex-wrap gap-1.5">
              {presets.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  title={p.query}
                  onClick={() => { setQuery(p.query); setLimit(60) }}
                  className={classes('rounded-md border px-2.5 py-1 text-sm', query === p.query ? 'border-primary bg-primary text-primary-foreground' : 'bg-card hover:bg-hover')}
                >
                  {p.label}
                </button>
              ))}
            </div>
            {!results.length ? <Panel role="status">No matches.</Panel> : (
              <ul className="overflow-hidden rounded-lg border bg-card">
                {results.slice(0, limit).map((b) => {
                  const open = openId === b.bookId
                  return (
                    <li key={b.bookId} className="border-b last:border-b-0">
                      <button type="button" onClick={() => setOpenId(open ? undefined : b.bookId)} className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-hover">
                        <Cover book={b} size="SY75" className="w-7 shrink-0" />
                        <span className="min-w-0 flex-1 truncate">
                          <span className="font-semibold">{b.title}</span>
                          <span className="text-muted-foreground"> — {b.authorName}</span>
                        </span>
                        <span className="hidden shrink-0 sm:inline"><ShelfBadge shelf={b.userShelf} /></span>
                        <span className="hidden w-20 shrink-0 text-right sm:inline"><Stars value={b.userRating} /></span>
                        <span className="w-24 shrink-0 text-right text-sm text-muted-foreground tabular-nums">
                          {(fields[sortKey] as FieldDef).render?.(b) ?? fields[sortKey].value(b)}
                        </span>
                      </button>
                      {open && <Expanded book={b} />}
                    </li>
                  )
                })}
              </ul>
            )}
            {limit < results.length && (
              <div className="mt-4 flex items-center gap-4">
                <Button onClick={() => setLimit(limit + 60)}>Show more</Button>
                <span className="text-muted-foreground">{limit} of {results.length}</span>
              </div>
            )}
          </>
        )
      }}
    </Loaded>
  )
}

function Expanded({ book: b }: { book: Book }) {
  const facts: [string, ReactNode][] = [
    ['Shelf', shelfName(b.userShelf)], ['Mine', <Stars value={b.userRating} />], ['Average', b.averageRating],
    ['Pages', b.numPages], ['Published', b.bookPublished || '—'], ['Added', day(b.userAddedAt)],
    ['First read', day(b.userFirstReadAt)], ['Last read', day(b.userLastReadAt)], ['Reads', b.userReadCount],
    ['ISBN', b.isbn || '—'],
  ]
  return (
    <div className="grid gap-4 border-t bg-table-stripe px-4 py-4 sm:grid-cols-[8rem_1fr]">
      <Cover book={b} className="hidden w-32 sm:block" />
      <div className="grid content-start gap-3 text-sm">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-5">
          {facts.map(([k, v]) => <div key={k}><dt className="text-xs text-muted-foreground">{k}</dt><dd className="tabular-nums">{v}</dd></div>)}
        </dl>
        {b.userReview && <blockquote className="border-l-2 border-primary pl-3 italic">{b.userReview}</blockquote>}
        {b.bookDescription && <p className="line-clamp-4 text-muted-foreground">{b.bookDescription}</p>}
        {b.timeline.length > 0 && (
          <p className="text-xs text-muted-foreground">{b.timeline.map((t) => `${t.dateText || '?'} ${t.event}`).join(' → ')}</p>
        )}
        <BookLink book={b} className="justify-self-start">Open book page →</BookLink>
      </div>
    </div>
  )
}

// ------------------------------------------------------------ S: synthesis

type View = 'table' | 'small' | 'large'

// The fields a query shows: `show:` if given; else the shelf (unless one
// shelf), progress (reading), the filtered and sorted fields, then defaults
// for the shelf, up to 4 (5 at most).
function columnsFor(parsed: Parsed): FieldKey[] {
  if (parsed.shown.length) return parsed.shown
  const columns: FieldKey[] = []
  const add = (key: FieldKey) => { if (!columns.includes(key)) columns.push(key) }
  const { shelves } = parsed
  if (shelves.length !== 1) add('shelf')
  if (shelves.includes('currently-reading')) add('progress')
  for (const key of parsed.mentioned) add(key)
  for (const { key } of parsed.sorts) if (key !== 'title' && key !== 'author') add(key)
  const unread = shelves.length > 0 && shelves.every((s) => s === 'to-read' || s === 'on-deck')
  const defaults: FieldKey[] = shelves.length === 1 && shelves[0] === 'currently-reading'
    ? ['pages', 'avg', 'updated']
    : unread ? ['avg', 'pages', 'published', 'added'] : ['mine', 'avg', 'pages', 'read']
  for (const key of defaults) if (columns.length < 4) add(key)
  return columns.slice(0, 5)
}

function run(data: Book[], parsed: Parsed) {
  let results = search(data, bookKeys, parsed.text).filter((b) => parsed.filters.every((f) => f.test(b)))
  const sorts = parsed.sorts.length ? parsed.sorts : parsed.text ? [] : [{ key: 'updated' as FieldKey, descending: true }]
  if (sorts.length) results = results.toSorted(then(...sorts.map(({ key, descending }) => compareBy(key, descending))))
  return results
}

// The query with `key` as its primary sort; the other sorts stay as tie-breaks.
function withSort(query: string, parsed: Parsed, key: FieldKey, descending: boolean) {
  const sorts = [{ key, descending }, ...parsed.sorts.filter((s) => s.key !== key)]
  const spec = sorts.map((s) => (s.descending ? '-' : '') + (s.key === 'mine' ? 'rating' : s.key)).join(',')
  return [...query.trim().split(/\s+/).filter((t) => t && !t.startsWith('sort:')), `sort:${spec}`].join(' ')
}

// A field as a short line under a cover.
function short(key: FieldKey, b: Book): ReactNode {
  switch (key) {
    case 'mine': return b.userRating ? <Stars value={b.userRating} /> : null
    case 'avg': return `avg ${b.averageRating}`
    case 'gap': return gap(b) === undefined ? null : `${signed(gap(b))} vs avg`
    case 'pages': return b.numPages ? `${b.numPages} p` : null
    case 'published': return b.bookPublished ? `pub. ${b.bookPublished.slice(0, 4)}` : null
    case 'added': return `added ${b.userAddedAt.slice(0, 7)}`
    case 'updated': return `active ${day(b.userUpdatedAt)}`
    case 'read': return b.userLastReadAt ? `read ${day(b.userLastReadAt)}` : null
    case 'first': return b.userFirstReadAt ? `first ${day(b.userFirstReadAt)}` : null
    case 'reads': return b.userReadCount > 1 ? `read ${b.userReadCount}×` : null
    case 'shelf': return shelfName(b.userShelf)
    case 'progress': return progress(b) === undefined ? null : <Progress value={progress(b)} />
    case 'author': return b.authorName
    case 'title': return null
  }
}

function Shorts({ book, columns, max }: { book: Book; columns: FieldKey[]; max?: number }) {
  const bits = columns.map((key) => [key, short(key, book)] as const).filter(([, v]) => v !== null).slice(0, max)
  return <>{bits.map(([key, v]) => <span key={key} className="block truncate">{v}</span>)}</>
}

const lanesS = ['now', 'loved', 'year', 'deck', 'quick', 'gems', 'rereads', 'outlier', 'waiting']

function VariantS({ books }: { books: Books }) {
  const [query, setQuery] = useState('')
  const [view, setView] = useState<View>('table')
  const [limit, setLimit] = useState(60)
  const parsed = parse(query)
  const columns = columnsFor(parsed)
  const go = (q: string) => { setQuery(q); setLimit(60); window.scrollTo({ top: 0 }) }

  return (
    <Loaded books={books}>
      {(data) => {
        const results = query.trim() ? run(data, parsed) : []
        return (
          <>
            <header className="mb-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
              <Heading>Books</Heading>
              {query.trim() && <Count n={results.length} />}
            </header>
            <label className="grid gap-1.5">
              <span className="sr-only">Query</span>
              <input
                type="search"
                spellCheck={false}
                placeholder="shelf:on-deck pages:<300 sort:-avg   — or just words"
                className={classes(control, 'font-mono text-base')}
                value={query}
                onChange={(e) => { setQuery(e.target.value); setLimit(60) }}
              />
            </label>
            <details className="mt-2 text-xs text-muted-foreground">
              <summary className="cursor-pointer">
                Query help
                {parsed.unknown.length > 0 && <> · Not understood: <strong className="text-foreground line-through">{parsed.unknown.join(' ')}</strong></>}
              </summary>
              <p className="mt-1">
                Words search title, author, description. Filters: <code>shelf:on-deck,to-read</code> <code>rating:&gt;=4</code> <code>avg:&gt;=4.3</code> <code>pages:&lt;300</code> <code>year:2025</code> <code>reads:&gt;=2</code> <code>gap:&gt;=0.8</code> <code>published:&lt;1950</code> <code>tag:long-term</code>.
                Order: <code>sort:-avg,-added</code> (minus = high first; later fields break ties). Fields shown follow the query; override with <code>show:avg,pages,read</code>.
                Field names: read, first, rating, avg, gap, pages, published, added, updated, reads, shelf, progress, title, author.
              </p>
            </details>
            <div className="mt-3 mb-5 flex flex-wrap gap-1.5">
              {query.trim() && <button type="button" onClick={() => go('')} className="rounded-md border bg-card px-2.5 py-1 text-sm hover:bg-hover">← Journal</button>}
              {presets.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  title={p.query}
                  onClick={() => go(p.query)}
                  className={classes('rounded-md border px-2.5 py-1 text-sm', query === p.query ? 'border-primary bg-primary text-primary-foreground' : 'bg-card hover:bg-hover')}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {!query.trim() ? <Journal data={data} onOpen={go} /> : (
              <>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm text-muted-foreground">
                    Showing {columns.map((k) => fields[k].label).join(' · ')}
                    {!parsed.shown.length && <> <span className="opacity-70">(from the query; <code>show:</code> to change)</span></>}
                  </p>
                  <div role="group" aria-label="View" className="flex overflow-hidden rounded-md border text-sm">
                    {(['table', 'small', 'large'] as const).map((v) => (
                      <button
                        key={v}
                        type="button"
                        aria-pressed={view === v}
                        onClick={() => setView(v)}
                        className={classes('px-3 py-1.5 capitalize', view === v ? 'bg-primary text-primary-foreground' : 'bg-card hover:bg-hover')}
                      >
                        {v === 'table' ? 'Table' : v === 'small' ? 'Small cards' : 'Large cards'}
                      </button>
                    ))}
                  </div>
                </div>
                {!results.length ? <Panel role="status">No matches.</Panel> : (
                  <>
                    {view === 'table' && <QueryTable results={results.slice(0, limit)} columns={columns} parsed={parsed} onSort={(k, d) => setQuery(withSort(query, parsed, k, d))} />}
                    {view === 'small' && (
                      <ul className="grid grid-cols-3 gap-x-3 gap-y-5 sm:grid-cols-5 lg:grid-cols-7">
                        {results.slice(0, limit).map((b) => <SmallCard key={b.bookId} book={b} columns={columns} />)}
                      </ul>
                    )}
                    {view === 'large' && (
                      <ul className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-4">
                        {results.slice(0, limit).map((b) => <LargeCard key={b.bookId} book={b} columns={columns} />)}
                      </ul>
                    )}
                  </>
                )}
                {limit < results.length && (
                  <div className="mt-6 flex items-center gap-4">
                    <Button onClick={() => setLimit(limit + 60)}>Show more</Button>
                    <span className="text-muted-foreground">{limit} of {results.length}</span>
                  </div>
                )}
              </>
            )}
          </>
        )
      }}
    </Loaded>
  )
}

// C's lanes, each one a preset's query; "See all" opens it in the query line.
function Journal({ data, onOpen }: { data: Book[]; onOpen: (query: string) => void }) {
  return (
    <>
      {lanesS.map((key) => {
        const p = presets.find((x) => x.key === key)!
        const parsed = parse(p.query)
        const items = run(data, parsed)
        const columns = columnsFor(parsed).filter((k) => k !== 'shelf')
        if (!items.length) return null
        return (
          <section key={key} className="mb-9">
            <div className="mb-3 flex items-baseline justify-between gap-4">
              <div className="min-w-0">
                <h2 className="text-xl font-bold">{p.label} <span className="font-normal text-muted-foreground">{items.length}</span></h2>
                <p className="truncate text-sm text-muted-foreground">{p.hint} · <code className="text-xs">{p.query}</code></p>
              </div>
              <button type="button" className="shrink-0 text-accent" onClick={() => onOpen(p.query)}>See all →</button>
            </div>
            <ul className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-2">
              {items.slice(0, 12).map((b) => <SmallCard key={b.bookId} book={b} columns={columns} className="w-28 shrink-0 sm:w-32" max={2} />)}
            </ul>
          </section>
        )
      })}
    </>
  )
}

// C's small card: cover, title, then the query's first fields.
function SmallCard({ book: b, columns, className, max = 2 }: { book: Book; columns: FieldKey[]; className?: string; max?: number }) {
  return (
    <li className={className}>
      <BookLink book={b} className="group grid gap-1.5 text-inherit no-underline">
        <Cover book={b} className="w-full" />
        <span className="line-clamp-2 text-sm leading-snug font-semibold group-hover:underline">{b.title}</span>
        <span className="grid gap-0.5 text-xs text-muted-foreground"><Shorts book={b} columns={columns} max={max} /></span>
      </BookLink>
    </li>
  )
}

// B's large card, with progress when there is some, and the query's fields.
function LargeCard({ book: b, columns }: { book: Book; columns: FieldKey[] }) {
  const p = progress(b)
  const rest = columns.filter((k) => k !== 'mine' && k !== 'avg' && k !== 'shelf' && k !== 'progress')
  return (
    <li>
      <BookLink book={b} className="group grid gap-2 text-inherit no-underline">
        <span className="relative">
          <Cover book={b} className="w-full transition group-hover:shadow-card" />
          {b.userShelf === 'currently-reading' && p !== undefined && (
            <span className="absolute inset-x-0 bottom-0 h-1.5 overflow-hidden rounded-b-sm bg-card/70">
              <span className="block h-full bg-primary" style={{ width: `${p}%` }} />
            </span>
          )}
        </span>
        <span className="line-clamp-2 leading-snug font-semibold group-hover:underline">{b.title}</span>
        <span className="-mt-1.5 truncate text-sm text-muted-foreground">{b.authorName}</span>
        <span className="flex items-center justify-between gap-2 text-sm">
          {b.userShelf === 'currently-reading' ? <Progress value={p} /> : <Stars value={b.userRating} />}
          <span className="text-muted-foreground tabular-nums">avg {b.averageRating}</span>
        </span>
        <span className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
          <ShelfBadge shelf={b.userShelf} />
          <span className="truncate tabular-nums">{rest.slice(0, 2).map((k) => short(k, b)).filter((v) => v !== null).map((v, i) => <span key={i}>{i > 0 && ' · '}{v}</span>)}</span>
        </span>
      </BookLink>
    </li>
  )
}

// A's table; its columns come from the query, and a header click rewrites the
// query's `sort:`. A row click opens D's details in place.
function QueryTable({
  results, columns, parsed, onSort,
}: { results: Book[]; columns: FieldKey[]; parsed: Parsed; onSort: (key: FieldKey, descending: boolean) => void }) {
  const [openId, setOpenId] = useState<string>()
  const cell = 'border-b px-3 py-2.5 sm:px-4'
  const header = (key: FieldKey, label: string) => {
    const on = parsed.sort?.key === key
    const rank = parsed.sorts.findIndex((s) => s.key === key)
    const descending = on ? !parsed.sort!.descending : key !== 'title' && key !== 'author'
    return (
      <th key={key} scope="col" className={classes(cell, 'bg-table-heading whitespace-nowrap')}>
        <button type="button" className="inline-flex items-center gap-1.5 py-1 font-bold text-accent" onClick={() => onSort(key, descending)}>
          {label}
          <span aria-hidden="true" className="text-[0.85em]">{rank < 0 ? '↕' : (parsed.sorts[rank].descending ? '↓' : '↑') + (rank > 0 ? rank + 1 : '')}</span>
        </button>
      </th>
    )
  }
  return (
    <div className="overflow-x-auto rounded-lg border bg-card">
      <table className="w-full text-left">
        <thead><tr>{header('title', 'Book')}{columns.map((k) => header(k, fields[k].label))}</tr></thead>
        <tbody className="[&>tr:last-child>td]:border-b-0">
          {results.flatMap((b) => {
            const open = openId === b.bookId
            const row = (
              <tr key={b.bookId} className="cursor-pointer even:bg-table-stripe hover:bg-hover" onClick={(e) => { if (!(e.target as HTMLElement).closest('a')) setOpenId(open ? undefined : b.bookId) }}>
                <td className={classes(cell, 'w-[48%] min-w-56 align-top')}>
                  <span className="flex items-start gap-3">
                    <Cover book={b} size="SY75" className="w-9 shrink-0" />
                    <span className="grid">
                      <BookLink book={b} className="font-semibold" />
                      <span className="text-sm text-muted-foreground">{b.authorName}</span>
                    </span>
                  </span>
                </td>
                {columns.map((k) => <td key={k} className={classes(cell, 'align-top whitespace-nowrap tabular-nums')}>{(fields[k] as FieldDef).render?.(b) ?? fields[k].value(b)}</td>)}
              </tr>
            )
            return open
              ? [row, <tr key={b.bookId + '-open'}><td colSpan={columns.length + 1} className="border-b p-0"><Expanded book={b} /></td></tr>]
              : [row]
          })}
        </tbody>
      </table>
    </div>
  )
}
