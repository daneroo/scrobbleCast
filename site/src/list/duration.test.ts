import { expect, test } from 'vite-plus/test'
import { formatDuration, parseDuration } from './duration'

test('a duration is typed as units in descending order, each at most once', () => {
  expect(parseDuration('45m')).toBe(2700)
  expect(parseDuration('1h30m')).toBe(5400)
  expect(parseDuration('2d4h')).toBe(187200)
  expect(parseDuration('90s')).toBe(90)
  expect(parseDuration('1d2h3m4s')).toBe(93784)
  expect(parseDuration('0m')).toBe(0)
})

test('a bare number, wrong unit order, a repeated unit or anything else is not understood', () => {
  for (const text of ['90', '30m1h', '1h1h', '1h30', '', 'h', '1.5h', '1w', '-1h', '1H']) {
    expect(parseDuration(text), text).toBeUndefined()
  }
})

test('a duration past the safe integers is not understood, rather than rounded or infinite', () => {
  expect(parseDuration('9007199254740991s')).toBe(Number.MAX_SAFE_INTEGER)
  expect(parseDuration('9007199254740993s')).toBeUndefined()
  expect(parseDuration('1' + '0'.repeat(400) + 'd')).toBeUndefined()
})

test('a duration is formatted rounded to minutes, zero units left out', () => {
  expect(formatDuration(4159)).toBe('1h9m')
  expect(formatDuration(2700)).toBe('45m')
  expect(formatDuration(3600)).toBe('1h')
  expect(formatDuration(89)).toBe('1m')
  expect(formatDuration(3599)).toBe('1h')
})

test('a long duration is formatted with days', () => {
  expect(formatDuration(187200 + 20 * 60)).toBe('2d4h20m')
  expect(formatDuration(86400 + 5 * 60)).toBe('1d5m')
})

test('under half a minute is 0m', () => {
  expect(formatDuration(29)).toBe('0m')
  expect(formatDuration(0)).toBe('0m')
  expect(formatDuration(30)).toBe('1m')
})
