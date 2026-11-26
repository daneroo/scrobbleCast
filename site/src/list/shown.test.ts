import { expect, test } from 'vite-plus/test'
import { shortLines } from './shown'
import type { ShownField } from './shown'

interface Item { pages?: number; author?: string; rating?: number }

function field(key: string, short?: ShownField<Item>['short']): ShownField<Item> {
  return { key, label: key, kind: 'number', value: () => undefined, short }
}

const pages = field('pages', (item) => item.pages ? `${item.pages} p` : null)
const author = field('author', (item) => item.author)
const rating = field('rating', (item) => item.rating === undefined ? undefined : `${item.rating}★`)
const none = field('none')

test("a card's short lines follow the fields' order, each with its field's key", () => {
  expect(shortLines({ pages: 300, author: 'Banks', rating: 4 }, [author, pages, rating], 3))
    .toEqual([['author', 'Banks'], ['pages', '300 p'], ['rating', '4★']])
})

test('fields with nothing to say give no line, and those after them take their place', () => {
  expect(shortLines({ author: 'Banks', rating: 0 }, [none, pages, author, rating], 2))
    .toEqual([['author', 'Banks'], ['rating', '0★']])
})

test('at most `most` lines', () => {
  expect(shortLines({ pages: 300, author: 'Banks', rating: 4 }, [pages, author, rating], 1)).toEqual([['pages', '300 p']])
  expect(shortLines({ pages: 300 }, [pages], 0)).toEqual([])
})
