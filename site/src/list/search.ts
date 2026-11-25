import Fuse from 'fuse.js'
import { searchThreshold } from '../config'

interface Index<T> {
  fuse: Fuse<T>
  term?: string
  results?: T[]
}

// One index per list of items, with its last search: a page's result count and
// table search the same items for the same query.
const indexes = new WeakMap<object, unknown>()

// Every word in the query must fuzzy-match some key, so "culture banks" finds
// Culture novels by Banks, wherever in the key the word is (`ignoreLocation`):
// by default Fuse only looks near the start. `keys` must be the same for the
// same items.
export function search<T>(items: T[], keys: string[], query: string): T[] {
  const term = query.trim()
  if (!term) return items
  let index = indexes.get(items) as Index<T> | undefined
  if (!index) {
    index = { fuse: new Fuse(items, { keys, threshold: searchThreshold, ignoreLocation: true }) }
    indexes.set(items, index)
  }
  if (index.term !== term) {
    const words = term.split(/\s+/)
    index.term = term
    index.results = index.fuse.search({ $and: words.map((word) => ({ $or: keys.map((key) => ({ [key]: word })) })) }).map(({ item }) => item)
  }
  return index.results ?? items
}
