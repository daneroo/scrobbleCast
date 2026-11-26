import { parseDuration } from './duration'
import { search } from './search'

// The query model: one line of text that selects and orders a list (see
// "Query" in GLOSSARY.md). Pure and generic over the item type: a list
// defines itself once with `defineList`, and gets back `parse`, `format`,
// `run`, `shown`, `sortBy` and `help`.

// One sort, by a field's key. A list of them is the main sort, then its
// tie-breaks.
export interface Sort {
  readonly key: string
  readonly descending: boolean
}

// What a field holds for an item; `undefined` is "no value", which fails
// every filter and always sorts last.
export type Value = string | number | undefined

// What a field filters on: its value, or a list of them (tags, or texts any
// of which may match).
type FilterValue = Value | readonly string[]

// One keyword of a list's query, and one of the fields it can show.
export interface Field<T> {
  // The word typed (`pages`), and other words for it.
  key: string
  aliases?: readonly string[]
  // Names the key ("Rating" for `rating`, "Last read" for `read`): a header
  // tells you what to type.
  label: string
  kind: Kind
  // To sort by, to filter by, and the plain cell.
  value: (item: T) => Value
  // To filter by when it differs from `value` (unrated as 0, a gap's size).
  filterValue?: (item: T) => FilterValue
  // A choice field's known values, as `filterValue` (or `value`) gives them.
  choices?: readonly string[]
  // Shown too when the field is filtered on.
  alsoShow?: readonly string[]
  // Its filter never counts as shared, whatever its kind says: a gap filters
  // on its size, so the results of `gap:0.8` still show +0.8 and -0.8.
  neverShared?: boolean
  // For the help: a rule of its own, and an example token (`rating:>=4`);
  // without one, its kind gives an example.
  note?: string
  example?: string
}

type Op = '>' | '<' | '>=' | '<=' | '='

// What each kind's filter holds, besides its key and its value as typed.
interface FilterData {
  number: { op: Op; number: number }
  // In seconds.
  duration: { op: Op; number: number }
  // A year, month or day: [year], [year, month] or [year, month, day].
  date: { op: Op; date: readonly number[] }
  choice: { choices: readonly string[] }
  tags: { tags: readonly string[] }
  text: object
}

// A field's kind: how its filter is typed and tested, how it sorts, and what
// the help says about it. See `kinds`.
type Kind = keyof FilterData

type FilterOf<K extends Kind> = Readonly<{ key: string; kind: K; text: string } & FilterData[K]>

// A filter, its key canonical and its value as typed.
type Filter = { [K in Kind]: FilterOf<K> }[Kind]

// What sorts compare: no value, a number, text, or numbers in turn (a date).
type Comparable = number | string | readonly number[] | undefined

// A kind's rules take any list's field (`Field<never>`): they read only its
// choices, never its items.
interface KindRules<K extends Kind> {
  // The filter for a value typed after the key, or none when the kind can't
  // take it.
  parse: (text: string, field: Field<never>) => FilterData[K] | undefined
  // Whether an item's value (never "no value") passes the filter.
  match: (filter: FilterOf<K>, value: Exclude<FilterValue, undefined>) => boolean
  // Whether every item the filter passes has the same value (`rating:5`), so
  // that showing the field says nothing new.
  shared?: (filter: FilterOf<K>) => boolean
  // Which way a header click first sorts, and what a sort compares. Without
  // it, the kind only filters: its fields never sort or show.
  sort?: { descending: boolean; key: (value: Exclude<Value, undefined>) => Comparable }
  // For the help: how a value is typed, and an example of one.
  help: { syntax: (field: Field<never>) => string; example: (field: Field<never>) => string }
}

const numberValue = /^(>=|<=|>|<|=)?(-?\d+(?:\.\d+)?)$/
const durationValue = /^(>=|<=|>|<|=)?(.*)$/
const typedDate = /^(>=|<=|>|<|=)?(-?\d{1,4})(?:-(\d{2})(?:-(\d{2}))?)?$/
// An ISO 8601 date, from a year ("1995", "-0750") to a time.
const isoDate = /^([+-]?\d{4,})(?:-(\d{2})(?:-(\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2}(?:\.\d+)?))?Z?)?)?)?$/

// A number or duration filter's test, sort and sharing: compared as numbers,
// high first on the first click, `=` shared.
const comparedAsNumbers = {
  match: ({ op, number }: { op: Op; number: number }, value: Exclude<FilterValue, undefined>) => typeof value === 'number' && passes(op, value - number),
  shared: ({ op }: { op: Op }) => op === '=',
  sort: { descending: true, key: (value: Exclude<Value, undefined>) => typeof value === 'number' ? value : undefined },
}

// A filter value as texts: a list as it is, anything else as one.
function texts(value: Exclude<FilterValue, undefined>): readonly string[] {
  return typeof value === 'object' ? value : [String(value)]
}

// The operator of a number or date filter: a bare value means `=`.
function opOf(typed: string | undefined) {
  return (typed ?? '=') as Op
}

// `order` is the item's value against the typed one: below, equal or above 0.
function passes(op: Op, order: number) {
  return op === '>' ? order > 0 : op === '<' ? order < 0 : op === '>=' ? order >= 0 : op === '<=' ? order <= 0 : order === 0
}

// A date's numbers, as far as it gives them: year (negative before year 0),
// month, day, then the time of day. None when it isn't ISO 8601.
function dateNumbers(text: string): number[] | undefined {
  const match = isoDate.exec(text)
  if (!match) return undefined
  const numbers: number[] = []
  for (const part of match.slice(1)) {
    if (part === undefined) break
    numbers.push(Number(part))
  }
  return numbers
}

// Days in a month, leap years by the Gregorian rule (1900 has no 29 February,
// 2000 does).
function daysIn(year: number, month: number) {
  if (month === 2) return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0 ? 29 : 28
  return [4, 6, 9, 11].includes(month) ? 30 : 31
}

// A date's first and last day as precise as `length` numbers (a year, a
// month or a day): 1995 at a day's precision spans 1995-01-01 to 1995-12-31.
function span(numbers: readonly number[], length: number) {
  const first = numbers.slice(0, length)
  const last = [...first]
  if (first.length === 1 && length > 1) {
    first.push(1)
    last.push(12)
  }
  if (first.length === 2 && length > 2) {
    first.push(1)
    last.push(daysIn(last[0], last[1]))
  }
  return [first, last]
}

// Numbers in turn; a shorter list that agrees so far comes first.
function compareNumbers(a: readonly number[], b: readonly number[]) {
  for (let i = 0; i < Math.min(a.length, b.length); i++) if (a[i] !== b[i]) return a[i] - b[i]
  return a.length - b.length
}

// Every kind's rules, one entry each: a new kind is a new entry here (and its
// filter's data in `FilterData`).
const kinds: { [K in Kind]: KindRules<K> } = {
  number: {
    parse: (text) => {
      const match = numberValue.exec(text)
      return match ? { op: opOf(match[1]), number: Number(match[2]) } : undefined
    },
    ...comparedAsNumbers,
    help: { syntax: () => 'a number after > < >= <= or =; a bare number means =', example: () => '>1' },
  },
  // Seconds, typed in units (`1h30m`, see `parseDuration`): a bare number is
  // not understood.
  duration: {
    parse: (text) => {
      const [, op, duration] = durationValue.exec(text) ?? []
      const seconds = parseDuration(duration ?? '')
      return seconds === undefined ? undefined : { op: opOf(op), number: seconds }
    },
    ...comparedAsNumbers,
    help: { syntax: () => 'a duration (45m, 1h30m, 2d) after > < >= <= or =', example: () => '>=1h30m' },
  },
  // Compared at the precision typed: `2024` is any day that year.
  date: {
    parse: (text) => {
      const match = typedDate.exec(text)
      if (!match) return undefined
      const date = match.slice(2).filter((part) => part !== undefined).map(Number)
      const [year, month = 1, day = 1] = date
      if (month < 1 || month > 12 || day < 1 || day > daysIn(year, month)) return undefined
      return { op: opOf(match[1]), date }
    },
    // An item's date less precise than the one typed passes when every day
    // it may be passes: 1995 is >=1995-01 but not >1995-01, which it can't
    // say.
    match: ({ op, date }, value) => {
      const numbers = typeof value === 'string' ? dateNumbers(value) : undefined
      if (!numbers) return false
      return span(numbers, date.length).every((end) => passes(op, compareNumbers(end, date)))
    },
    sort: { descending: true, key: (value) => dateNumbers(String(value)) },
    help: {
      syntax: () => 'a year, month or day (2025, 2024-06, 2020-06-15) after > < >= <= or =, compared at that precision; a minus before the year for BC (-750)',
      example: () => '>=2020',
    },
  },
  // A comma list of known values; a value that isn't one matches every value
  // containing it, and one that matches none is not understood.
  choice: {
    parse: (text, field) => {
      const known = field.choices ?? []
      const choices = new Set<string>()
      for (const part of text.toLowerCase().split(',')) {
        const matches = known.includes(part) ? [part] : known.filter((choice) => part && choice.includes(part))
        if (!matches.length) return undefined
        for (const choice of matches) choices.add(choice)
      }
      return { choices: [...choices] }
    },
    match: ({ choices }, value) => choices.includes(String(value).toLowerCase()),
    shared: ({ choices }) => choices.length === 1,
    sort: { descending: false, key: String },
    help: {
      syntax: (field) => `one of ${(field.choices ?? []).join(', ')}, or a comma list of them; part of one matches every one containing it`,
      example: (field) => field.choices?.[0] ?? '',
    },
  },
  // A comma list; an item with any of them matches. It only filters.
  tags: {
    parse: (text) => {
      const tags = text.toLowerCase().split(',')
      return tags.every(Boolean) ? { tags } : undefined
    },
    match: ({ tags }, value) => texts(value).some((tag) => tags.includes(tag.toLowerCase())),
    help: { syntax: () => 'names, exact but in any case, comma separated: any of them', example: () => 'name' },
  },
  // Case-insensitive contains; a field filtering on several texts matches
  // when any of them contains it.
  text: {
    parse: (text) => text ? {} : undefined,
    match: ({ text }, value) => texts(value).some((each) => each.toLowerCase().includes(text.toLowerCase())),
    sort: { descending: false, key: String },
    help: { syntax: () => 'any text it contains, in any case', example: () => 'word' },
  },
}

// Whether a field sorts and shows, rather than only filtering.
function sortable(field: Field<never>) {
  return kinds[field.kind].sort !== undefined
}

// The rules of a filter's kind.
function rulesOf<K extends Kind>(filter: FilterOf<K>): KindRules<K> {
  return kinds[filter.kind]
}

// The query's tokens in the order typed: `format` writes them back.
type Token = Readonly<
  | { type: 'word'; text: string }
  | { type: 'filter'; filter: Filter }
  | { type: 'sort'; sorts: readonly Sort[] }
  | { type: 'show'; keys: readonly string[] }
  | { type: 'not-understood'; text: string }
>

// A parsed query: plain data, a snapshot nothing changes (`sortBy` makes a
// new one). `tokens` is the whole of it; the rest is read from them.
export interface Query {
  readonly tokens: readonly Token[]
  readonly words: readonly string[]
  // Every filter applies.
  readonly filters: readonly Filter[]
  // From the last `sort:`; empty when there is none.
  readonly sorts: readonly Sort[]
  // The order `run` applies: `sorts`; without them, the list's default sort
  // when there are no words, or none (the words' relevance).
  readonly order: readonly Sort[]
  // From the last `show:`, when there is one.
  readonly show?: readonly string[]
  // As typed.
  readonly notUnderstood: readonly string[]
}

// A named query, fixed in code: a button that fills the query line, and a
// lane of the journal unless `excludeFromJournalLanes`.
export interface Preset {
  readonly label: string
  // A sentence on what it finds, under its lane's title.
  readonly hint: string
  readonly query: string
  readonly excludeFromJournalLanes?: boolean
}

export interface ListDefinition<T, F extends Field<T>> {
  fields: readonly F[]
  // The item's keys that words search, and how strictly (Fuse's threshold;
  // the site's default without one).
  searchKeys: string[]
  searchThreshold?: number
  // The order of a query with no words and no `sort:`.
  defaultSort: readonly Sort[]
  // Fields the table's lead column already shows: sorting on them adds no
  // field.
  lead?: readonly string[]
  // The default-fields rule: the keys shown first for a query, and the
  // defaults that fill up to `fillTo`; `most` fields in all.
  pinned: (query: Query) => readonly string[]
  fill: (query: Query) => readonly string[]
  fillTo: number
  most: number
  // For the help: what words search ("title, author and description"), and
  // an example `sort:` and `show:`.
  help: { words: string; sort: string; show: string }
}

// One field in the help.
export interface FieldHelp {
  key: string
  label: string
  aliases: readonly string[]
  // How its value is typed, from its kind.
  syntax: string
  note?: string
  example: string
  // Shown too when it is filtered on.
  alsoShow: readonly string[]
  // Whether `sort:` and `show:` take it; otherwise it only filters.
  sorts: boolean
}

// The help for a list's query, generated from its fields.
export interface Help {
  words: string
  fields: readonly FieldHelp[]
  sort: { example: string; syntax: string }
  show: { example: string; syntax: string }
}

const reserved = ['sort', 'show']
// `name:value`, the name a letter then letters, digits, `_` or `-`: a key,
// known or not, so an unknown one is not understood rather than a word.
const keyToken = /^([a-z][\w-]*):(.*)$/i

export function defineList<T, F extends Field<T> = Field<T>>(list: ListDefinition<T, F>) {
  // Every key and alias, lower case, to its field.
  const byName = new Map<string, F>()
  for (const field of list.fields) {
    for (const name of [field.key, ...(field.aliases ?? [])]) {
      const lower = name.toLowerCase()
      if (byName.has(lower) || reserved.includes(lower)) throw new Error(`Field name taken: ${name}`)
      byName.set(lower, field)
    }
  }

  // A field by the key the list's own code names: a wrong key is a bug.
  function fieldOf(key: string) {
    const found = byName.get(key.toLowerCase())
    if (!found) throw new Error(`No field: ${key}`)
    return found
  }

  // A field the list's own code sorts or shows by.
  function shownField(key: string) {
    const field = fieldOf(key)
    if (!sortable(field)) throw new Error(`Filter-only field: ${key}`)
    return field
  }

  for (const { key } of list.defaultSort) shownField(key)
  for (const key of list.lead ?? []) shownField(key)

  function parseFilter(field: F, text: string): Filter | undefined {
    const data = kinds[field.kind].parse(text, field)
    return data && ({ key: field.key, kind: field.kind, text, ...data } as Filter)
  }

  // `-avg,pages`: each field once, minus meaning high first.
  function parseSorts(text: string): Sort[] | undefined {
    const sorts: Sort[] = []
    for (const part of text.split(',')) {
      const descending = part.startsWith('-')
      const field = byName.get(part.slice(descending ? 1 : 0).toLowerCase())
      if (!field || !sortable(field)) return undefined
      if (!sorts.some(({ key }) => key === field.key)) sorts.push({ key: field.key, descending })
    }
    return sorts
  }

  function parseShow(text: string): string[] | undefined {
    const keys: string[] = []
    for (const part of text.split(',')) {
      const field = byName.get(part.toLowerCase())
      if (!field || !sortable(field)) return undefined
      if (!keys.includes(field.key)) keys.push(field.key)
    }
    return keys
  }

  function parseToken(text: string): Token {
    const match = keyToken.exec(text)
    if (!match) return { type: 'word', text }
    const name = match[1].toLowerCase()
    const value = match[2]
    const notUnderstood = { type: 'not-understood', text } as const
    if (name === 'sort') {
      const sorts = parseSorts(value)
      return sorts ? { type: 'sort', sorts } : notUnderstood
    }
    if (name === 'show') {
      const keys = parseShow(value)
      return keys ? { type: 'show', keys } : notUnderstood
    }
    const field = byName.get(name)
    const filter = field && parseFilter(field, value)
    return filter ? { type: 'filter', filter } : notUnderstood
  }

  function fromTokens(tokens: readonly Token[]): Query {
    const words: string[] = []
    const filters: Filter[] = []
    const notUnderstood: string[] = []
    let sorts: readonly Sort[] = []
    let show: readonly string[] | undefined
    for (const token of tokens) {
      if (token.type === 'word') words.push(token.text)
      else if (token.type === 'filter') filters.push(token.filter)
      else if (token.type === 'sort') sorts = token.sorts
      else if (token.type === 'show') show = token.keys
      else notUnderstood.push(token.text)
    }
    // The list's default sort is copied: the query holds its own order.
    const order = sorts.length ? sorts : words.length ? [] : list.defaultSort.map((sort) => ({ ...sort }))
    return { tokens, words, filters, sorts, order, show, notUnderstood }
  }

  function parse(text: string): Query {
    return fromTokens(text.split(/\s+/).filter(Boolean).map(parseToken))
  }

  function formatToken(token: Token) {
    switch (token.type) {
      case 'word':
      case 'not-understood':
        return token.text
      case 'filter':
        return `${token.filter.key}:${token.filter.text}`
      case 'sort':
        return 'sort:' + token.sorts.map(({ key, descending }) => (descending ? '-' : '') + key).join(',')
      case 'show':
        return 'show:' + token.keys.join(',')
    }
  }

  function format(query: Query): string {
    return query.tokens.map(formatToken).join(' ')
  }

  function test(filter: Filter, item: T) {
    const { filterValue, value: plainValue } = fieldOf(filter.key)
    const value = (filterValue ?? plainValue)(item)
    return value !== undefined && rulesOf(filter).match(filter, value)
  }

  // Words, then filters, then the query's order.
  function run(items: readonly T[], query: Query): T[] {
    const found = search(items, list.searchKeys, query.words.join(' '), list.searchThreshold)
      .filter((item) => query.filters.every((filter) => test(filter, item)))
    if (!query.order.length) return found
    const comparisons = query.order.map(({ key, descending }) => {
      const { value, kind } = shownField(key)
      const sortKey = (item: T) => {
        const plain = value(item)
        return plain === undefined ? undefined : kinds[kind].sort?.key(plain)
      }
      return (a: T, b: T) => compare(sortKey(a), sortKey(b), descending)
    })
    return found.toSorted((a, b) => {
      for (const comparison of comparisons) {
        const order = comparison(a, b)
        if (order) return order
      }
      return 0
    })
  }

  // A header click on `key`: it becomes the main sort, the way its kind
  // first sorts (numbers high first, dates newest first, text A→Z), or flips
  // if it already is; the query's earlier order stays as tie-breaks. A
  // filter-only field doesn't sort: the query stays as it is. The last `sort:` is rewritten in place and earlier
  // ones dropped; tokens not understood stay.
  function sortBy(query: Query, key: string): Query {
    const field = byName.get(key.toLowerCase())
    const kindSort = field && kinds[field.kind].sort
    if (!kindSort) return query
    const [main] = query.order
    const descending = main?.key === field.key ? !main.descending : kindSort.descending
    const token: Token = { type: 'sort', sorts: [{ key: field.key, descending }, ...query.order.filter((sort) => sort.key !== field.key)] }
    const last = query.tokens.findLastIndex((token) => token.type === 'sort')
    const tokens = last < 0
      ? [...query.tokens, token]
      : query.tokens.flatMap((old, index): Token[] => index === last ? [token] : old.type === 'sort' ? [] : [old])
    return fromTokens(tokens)
  }

  // The fields a query shows: those of `show:`; otherwise, without repeats:
  // 1. the pinned fields;
  // 2. the filtered fields, each after its also-show fields;
  // 3. the sorted fields;
  // 4. the fill, up to `fillTo`;
  // and `most` in all. A field isn't worth a column when it says nothing new:
  // - every result shares the value of a number `=` filter (`rating:5`) or a
  //   choice filter that names one value (`shelf:read`, `shelf:deck`), so
  //   those filters add no field (each kind's `shared`);
  // - a filter-only field (tags) never shows;
  // - the lead column already shows its fields (title, author), so neither a
  //   filter nor a sort on one adds it.
  function shown(query: Query): F[] {
    if (query.show) return query.show.map(shownField)
    const keys: string[] = []
    const add = (key: string) => { if (!keys.includes(key)) keys.push(key) }
    const addUnlessLead = (key: string) => { if (!list.lead?.includes(key)) add(key) }
    for (const key of list.pinned(query)) add(key)
    for (const filter of query.filters) {
      const field = fieldOf(filter.key)
      if (!sortable(field) || (!field.neverShared && rulesOf(filter).shared?.(filter))) continue
      for (const key of field.alsoShow ?? []) addUnlessLead(key)
      addUnlessLead(filter.key)
    }
    for (const { key } of query.sorts) addUnlessLead(key)
    for (const key of list.fill(query)) if (keys.length < list.fillTo) add(key)
    return keys.slice(0, list.most).map(shownField)
  }

  const generatedHelp: Help = {
    words: `Words search ${list.help.words}; every word must match. Words alone are ordered by relevance.`,
    fields: list.fields.map((field) => {
      const rules = kinds[field.kind]
      return {
        key: field.key,
        label: field.label,
        aliases: field.aliases ?? [],
        syntax: rules.help.syntax(field),
        note: field.note,
        example: field.example ?? `${field.key}:${rules.help.example(field)}`,
        alsoShow: field.alsoShow ?? [],
        sorts: sortable(field),
      }
    }),
    sort: { example: list.help.sort, syntax: 'fields, comma separated: a minus means high first, later fields break ties, and no value comes last' },
    show: { example: list.help.show, syntax: 'fields, comma separated: exactly these are shown' },
  }

  // An example that isn't one token about its own field (or `sort:`, or
  // `show:`) is a bug.
  const examples: [string, (token: Token) => boolean][] = [
    ...generatedHelp.fields.map(({ key, example }): [string, (token: Token) => boolean] => [example, (token) => token.type === 'filter' && token.filter.key === key]),
    [generatedHelp.sort.example, (token) => token.type === 'sort'],
    [generatedHelp.show.example, (token) => token.type === 'show'],
  ]
  for (const [example, about] of examples) {
    const { tokens } = parse(example)
    if (tokens.length !== 1 || !about(tokens[0])) throw new Error(`Help example not about its own field: ${example}`)
  }

  function help(): Help {
    return generatedHelp
  }

  return { parse, format, run, shown, sortBy, help }
}

// What a list defines itself into.
export type List<T, F extends Field<T> = Field<T>> = ReturnType<typeof defineList<T, F>>

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' })

// No value last, whichever the direction.
function compare(a: Comparable, b: Comparable, descending: boolean) {
  if (a === undefined || b === undefined) return a === b ? 0 : a === undefined ? 1 : -1
  const order = typeof a === 'number' && typeof b === 'number'
    ? a - b
    : typeof a === 'object' && typeof b === 'object' ? compareNumbers(a, b) : collator.compare(String(a), String(b))
  return descending ? -order : order
}
