import Fuse from 'fuse.js'

interface Index<T> {
  fuse: Fuse<T>
  term?: string
  results?: readonly T[]
}

// One index per list of items, its ordered keys and its threshold, with its
// last search: a page's result count and table search the same items for the
// same words.
// Results are shared between callers, so they are read-only.
const indexes = new WeakMap<object, Map<string, unknown>>()

// Every word must fuzzy-match some key, so "culture banks" finds Culture novels
// by Banks, wherever in the key the word is (`ignoreLocation`: by default Fuse
// only looks near the start). `threshold` is Fuse's: lower is stricter.
export function search<T>(items: readonly T[], keys: string[], words: string, threshold: number): readonly T[] {
  const term = words.trim()
  if (!term) return items
  let byKeys = indexes.get(items)
  if (!byKeys) {
    byKeys = new Map()
    indexes.set(items, byKeys)
  }
  const keysId = [threshold, ...keys].join('\0')
  let index = byKeys.get(keysId) as Index<T> | undefined
  if (!index) {
    index = { fuse: new Fuse(items, { keys, threshold, ignoreLocation: true }) }
    byKeys.set(keysId, index)
  }
  if (index.term !== term) {
    index.term = term
    index.results = index.fuse.search({ $and: term.split(/\s+/).map((word) => ({ $or: keys.map((key) => ({ [key]: word })) })) }).map(({ item }) => item)
  }
  return index.results ?? items
}
