import Fuse from 'fuse.js'
import { useMemo } from 'react'
import { searchThreshold } from './config'

// Every word in the query must fuzzy-match some key, so "culture banks" finds
// Culture novels by Banks.
export function useSearch<T>(items: T[], keys: string[], query: string) {
  const fuse = useMemo(() => new Fuse(items, { keys, threshold: searchThreshold }), [items, keys])
  const term = query.trim()
  return useMemo(() => {
    if (!term) return items
    const words = term.split(/\s+/)
    return fuse.search({ $and: words.map((word) => ({ $or: keys.map((key) => ({ [key]: word })) })) }).map(({ item }) => item)
  }, [fuse, items, keys, term])
}
