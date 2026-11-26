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

// Long descriptions give loose fuzzy matching a place to match almost any
// word; a stricter threshold keeps two words to the books that have them.
const shelf: Item[] = [
  { title: 'Excession', description: 'Iain M. Banks. A Culture novel: an Outside Context Problem arrives, and the Minds of the Culture must decide what to do about it.' },
  { title: 'The Years of Rice and Salt', description: 'An alternate history in which the Black Death kills nearly everyone in Europe, following souls through centuries of reincarnation into a future that owes its thanks to the East.' },
  { title: 'A Short History of Nearly Everything', description: 'A tour of science from the Big Bang to the rise of civilization, with the people who worked it out, their quarrels, their blunders, and the nature of the ranks they climbed.' },
  { title: 'Debt', description: 'An anthropologist traces credit and debt from ancient temple economies through coinage and empires, a picture of how the books were balanced in every age.' },
  { title: 'The Sea, the Sea', description: 'A retired theatre director withdraws to a house by the sea to write his memoirs, and is drawn back into the obsessions of a future he thought he had left on the banks of youth.' },
]

test('with a strict threshold, two words find only the item that has both', () => {
  expect(search(shelf, keys, 'culture banks').length).toBeGreaterThan(1)
  expect(search(shelf, keys, 'culture banks', 0.15).map(({ title }) => title)).toEqual(['Excession'])
  expect(search(shelf, keys, 'excesion banks', 0.15).map(({ title }) => title)).toEqual(['Excession'])
})
