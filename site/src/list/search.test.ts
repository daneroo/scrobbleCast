import { expect, test } from 'vite-plus/test'
import { search } from './search'

interface Item {
  title: string
  description: string
}

const keys = ['title', 'description']

const items: Item[] = [
  {
    title: 'The Spy',
    description: 'A long and winding tale of the years between the wars, told by a quiet Treasury officer who sees too much.',
  },
  { title: 'Culture', description: 'Ships, minds and games.' },
]

test('a word from the middle of a long field is found', () => {
  expect(search(items, keys, 'Treasury officer').map(({ title }) => title)).toEqual(['The Spy'])
})

test('every word must match something', () => {
  expect(search(items, keys, 'culture minds').map(({ title }) => title)).toEqual(['Culture'])
  expect(search(items, keys, 'culture treasury')).toEqual([])
})

test('the same items searched with different keys give each its own results', () => {
  expect(search(items, ['title'], 'treasury')).toEqual([])
  expect(search(items, ['description'], 'treasury').map(({ title }) => title)).toEqual(['The Spy'])
  expect(search(items, ['title'], 'treasury')).toEqual([])
})
