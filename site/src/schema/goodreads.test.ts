import { expect, test } from 'vite-plus/test'
import example from './goodreads-example.json'
import { Goodreads } from './goodreads'

test('the upstream example parses as a Goodreads feed', () => {
  expect(Goodreads.parse(example)).toHaveLength(example.length)
})

test('a Book with an unknown key is rejected', () => {
  const [book] = example
  expect(Goodreads.safeParse([{ ...book, extra: 'x' }]).success).toBe(false)
})
