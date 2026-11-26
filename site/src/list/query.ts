import { search } from './search'

// The query model: one line of text that selects and orders a list (see
// "Query" in GLOSSARY.md). Pure and generic over the item type: a list
// defines itself once with `defineList`, and gets back `parse`, `format`,
// `run`, `shown` and `sortBy`.

// One sort, by a field's key. A list of them is the main sort, then its
// tie-breaks.
export interface Sort {
  key: string
  descending: boolean
}

// A field's kind sets the operators its filter takes, and which way a header
// click first sorts it.
// - number: `> < >= <= =`, a bare value meaning `=`; first click high first.
// - choice: a comma list of known values; a value that isn't one matches
//   every value containing it, and one that matches none is not understood;
//   first click A→Z.
// - text: case-insensitive contains; first click A→Z.
// - date: ISO 8601 text, sorted as text; first click newest first. It takes
//   no filter yet: one is not understood.
export type Kind = 'number' | 'choice' | 'text' | 'date'

// What a field holds for an item; `undefined` is "no value", which fails
// every filter and always sorts last.
export type Value = string | number | undefined

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
  filterValue?: (item: T) => Value
  // A choice field's known values, as `filterValue` (or `value`) gives them.
  choices?: readonly string[]
  // Shown too when the field is filtered on.
  alsoShow?: readonly string[]
}

export type Op = '>' | '<' | '>=' | '<=' | '='

// A filter, its key canonical and its value as typed.
export type Filter =
  | { key: string; kind: 'number'; text: string; op: Op; number: number }
  | { key: string; kind: 'choice'; text: string; choices: string[] }
  | { key: string; kind: 'text'; text: string }

// The query's tokens in the order typed: `format` writes them back.
export type Token =
  | { type: 'word'; text: string }
  | { type: 'filter'; filter: Filter }
  | { type: 'sort'; sorts: Sort[] }
  | { type: 'show'; keys: string[] }
  | { type: 'not-understood'; text: string }

// A parsed query: plain data. `tokens` is the whole of it; the rest is read
// from them.
export interface Query {
  tokens: Token[]
  words: string[]
  // Every filter applies.
  filters: Filter[]
  // From the last `sort:`; empty when there is none.
  sorts: Sort[]
  // The order `run` applies: `sorts`; without them, the list's default sort
  // when there are no words, or none (the words' relevance).
  order: Sort[]
  // From the last `show:`, when there is one.
  show?: string[]
  // As typed.
  notUnderstood: string[]
}

export interface ListDefinition<T, F extends Field<T>> {
  fields: readonly F[]
  // The item's keys that words search.
  searchKeys: string[]
  // The order of a query with no words and no `sort:`.
  defaultSort: Sort[]
  // Fields the table's lead column already shows: sorting on them adds no
  // field.
  lead?: readonly string[]
  // The default-fields rule: the keys shown first for a query, and the
  // defaults that fill up to `fillTo`; `most` fields in all.
  pinned: (query: Query) => readonly string[]
  fill: (query: Query) => readonly string[]
  fillTo: number
  most: number
}

const reserved = ['sort', 'show']
const keyToken = /^([a-z]\w*):(.*)$/i
const numberValue = /^(>=|<=|>|<|=)?(-?\d+(?:\.\d+)?)$/

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

  for (const { key } of list.defaultSort) fieldOf(key)
  for (const key of list.lead ?? []) fieldOf(key)

  function parseFilter(field: F, text: string): Filter | undefined {
    const { key, kind } = field
    if (kind === 'number') {
      const match = numberValue.exec(text)
      return match ? { key, kind, text, op: (match[1] ?? '=') as Op, number: Number(match[2]) } : undefined
    }
    if (kind === 'choice') {
      const known = field.choices ?? []
      const choices = new Set<string>()
      for (const part of text.toLowerCase().split(',')) {
        const matches = known.includes(part) ? [part] : known.filter((choice) => part && choice.includes(part))
        if (!matches.length) return undefined
        for (const choice of matches) choices.add(choice)
      }
      return { key, kind, text, choices: [...choices] }
    }
    if (kind === 'date') return undefined
    return text ? { key, kind, text } : undefined
  }

  // `-avg,pages`: each field once, minus meaning high first.
  function parseSorts(text: string): Sort[] | undefined {
    const sorts: Sort[] = []
    for (const part of text.split(',')) {
      const descending = part.startsWith('-')
      const field = byName.get(part.slice(descending ? 1 : 0).toLowerCase())
      if (!field) return undefined
      if (!sorts.some(({ key }) => key === field.key)) sorts.push({ key: field.key, descending })
    }
    return sorts
  }

  function parseShow(text: string): string[] | undefined {
    const keys: string[] = []
    for (const part of text.split(',')) {
      const field = byName.get(part.toLowerCase())
      if (!field) return undefined
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

  function fromTokens(tokens: Token[]): Query {
    const query: Query = { tokens, words: [], filters: [], sorts: [], order: [], notUnderstood: [] }
    for (const token of tokens) {
      if (token.type === 'word') query.words.push(token.text)
      else if (token.type === 'filter') query.filters.push(token.filter)
      else if (token.type === 'sort') query.sorts = token.sorts
      else if (token.type === 'show') query.show = token.keys
      else query.notUnderstood.push(token.text)
    }
    query.order = query.sorts.length ? query.sorts : query.words.length ? [] : list.defaultSort
    return query
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
    if (value === undefined) return false
    if (filter.kind === 'number') {
      if (typeof value !== 'number') return false
      const { op, number } = filter
      return op === '>' ? value > number : op === '<' ? value < number : op === '>=' ? value >= number : op === '<=' ? value <= number : value === number
    }
    const text = String(value).toLowerCase()
    return filter.kind === 'choice' ? filter.choices.includes(text) : text.includes(filter.text.toLowerCase())
  }

  // Words, then filters, then the query's order.
  function run(items: readonly T[], query: Query): T[] {
    const found = search(items, list.searchKeys, query.words.join(' '))
      .filter((item) => query.filters.every((filter) => test(filter, item)))
    if (!query.order.length) return found
    const comparisons = query.order.map(({ key, descending }) => {
      const { value } = fieldOf(key)
      return (a: T, b: T) => compare(value(a), value(b), descending)
    })
    return found.toSorted((a, b) => {
      for (const comparison of comparisons) {
        const order = comparison(a, b)
        if (order) return order
      }
      return 0
    })
  }

  // A header click on `key`: it becomes the main sort, high first for numbers
  // and A→Z otherwise, or flips if it already is; the query's earlier order
  // stays as tie-breaks. The last `sort:` is rewritten in place and earlier
  // ones dropped; tokens not understood stay.
  function sortBy(query: Query, key: string): Query {
    const field = byName.get(key.toLowerCase())
    if (!field) return query
    const [main] = query.order
    const descending = main?.key === field.key ? !main.descending : field.kind === 'number' || field.kind === 'date'
    const token: Token = { type: 'sort', sorts: [{ key: field.key, descending }, ...query.order.filter((sort) => sort.key !== field.key)] }
    const last = query.tokens.findLastIndex((token) => token.type === 'sort')
    const tokens = last < 0
      ? [...query.tokens, token]
      : query.tokens.flatMap((old, index): Token[] => index === last ? [token] : old.type === 'sort' ? [] : [old])
    return fromTokens(tokens)
  }

  // The fields a query shows: those of `show:`; otherwise, without repeats,
  // the pinned fields, the filtered fields after their also-show fields
  // (except those every result shares: a number `=`, a single choice), the
  // sorted fields, then the fill up to `fillTo`; `most` in all. Fields the
  // lead column shows are not added for a filter or a sort.
  function shown(query: Query): F[] {
    if (query.show) return query.show.map(fieldOf)
    const keys: string[] = []
    const add = (key: string) => { if (!keys.includes(key)) keys.push(key) }
    const addUnlessLead = (key: string) => { if (!list.lead?.includes(key)) add(key) }
    for (const key of list.pinned(query)) add(key)
    for (const filter of query.filters) {
      if (filter.kind === 'number' && filter.op === '=') continue
      if (filter.kind === 'choice' && filter.choices.length === 1) continue
      for (const key of fieldOf(filter.key).alsoShow ?? []) addUnlessLead(key)
      addUnlessLead(filter.key)
    }
    for (const { key } of query.sorts) addUnlessLead(key)
    for (const key of list.fill(query)) if (keys.length < list.fillTo) add(key)
    return keys.slice(0, list.most).map(fieldOf)
  }

  return { parse, format, run, shown, sortBy }
}

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' })

// No value last, whichever the direction.
function compare(a: Value, b: Value, descending: boolean) {
  if (a === undefined || b === undefined) return a === b ? 0 : a === undefined ? 1 : -1
  const order = typeof a === 'number' && typeof b === 'number' ? a - b : collator.compare(String(a), String(b))
  return descending ? -order : order
}
