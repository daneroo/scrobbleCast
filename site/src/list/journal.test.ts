import { expect, test } from 'vite-plus/test'
import { hasLanes, journalLanes } from './journal'
import { defineList } from './query'
import type { Preset } from './query'

// A test-only list: jars, each with a name and a size.
interface Jar { name: string; size: number }

const jars = defineList<Jar>({
  fields: [
    { key: 'name', label: 'Name', kind: 'text', value: (jar) => jar.name },
    { key: 'size', label: 'Size', kind: 'number', value: (jar) => jar.size },
  ],
  searchKeys: ['name'],
  searchThreshold: 0.4,
  defaultSort: [{ key: 'size', descending: true }],
  pinned: () => [],
  fill: () => ['size'],
  fillTo: 1,
  most: 2,
  help: { words: 'name', sort: 'sort:size', show: 'show:size' },
})

const items: Jar[] = [1, 2, 3, 4, 5, 6, 7, 8].map((size) => ({ name: `Jar ${size}`, size }))

const presets: Preset[] = [
  { label: 'Small', hint: 'Under 4', query: 'size:<4 sort:size' },
  { label: 'All', hint: 'Every jar', query: 'sort:-size', excludeFromJournalLanes: true },
  { label: 'Huge', hint: 'Over 100', query: 'size:>100' },
  { label: 'Big', hint: 'Over 2, biggest first', query: 'size:>2 sort:-size' },
]

function lanes(length: number) {
  return journalLanes(jars, presets, items, length).map(({ preset, count, cards }) => ({
    label: preset.label,
    count,
    cards: cards.map(({ size }) => size),
  }))
}

test('one lane per preset, in their order, without the excluded or the empty', () => {
  expect(lanes(3)).toEqual([
    { label: 'Small', count: 3, cards: [1, 2, 3] },
    { label: 'Big', count: 6, cards: [8, 7, 6] },
  ])
})

test('each lane has its query\'s fields for the cards', () => {
  expect(journalLanes(jars, presets, items, 3).map(({ fields }) => fields.map(({ key }) => key)))
    .toEqual([['size'], ['size']])
})

test('a list has lanes when a preset is not excluded from them, whatever its results', () => {
  expect(hasLanes(presets)).toBe(true)
  expect(hasLanes([{ label: 'Huge', hint: 'Over 100', query: 'size:>100' }])).toBe(true)
  expect(hasLanes([{ label: 'All', hint: 'Every jar', query: 'sort:-size', excludeFromJournalLanes: true }])).toBe(false)
  expect(hasLanes([])).toBe(false)
})
