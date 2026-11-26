import { expect, test } from 'vite-plus/test'
import { booksList } from './list'
import { bookPresets } from './presets'

test('every preset parses with nothing not understood', () => {
  for (const { label, query } of bookPresets) {
    expect({ label, notUnderstood: booksList.parse(query).notUnderstood }).toEqual({ label, notUnderstood: [] })
  }
})

test('the year preset follows the clock', () => {
  const year = String(new Date().getFullYear())
  expect(bookPresets.find(({ query }) => query.startsWith('year:'))?.query).toBe(`year:${year} sort:-read`)
})
