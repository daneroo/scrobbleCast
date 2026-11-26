import { expect, test } from 'vite-plus/test'
import { viewOn, viewSetting, viewsOn } from './view'

// A fake localStorage: the values saved, by key.
function fakeStorage(saved: Record<string, string> = {}) {
  return {
    saved,
    storage: {
      getItem: (key: string) => saved[key] ?? null,
      setItem: (key: string, value: string) => { saved[key] = value },
    },
  }
}

test('a first visit shows the table', () => {
  expect(viewSetting(fakeStorage().storage, 'books').get()).toBe('table')
})

test('a chosen view is what the next visit gets', () => {
  const { storage } = fakeStorage()
  const first = viewSetting(storage, 'books')

  first.set('small')
  expect(first.get()).toBe('small')

  expect(viewSetting(storage, 'books').get()).toBe('small')
})

test.each(['grid', '"small"', '{"view":"large"', ''])('a garbled saved view (%j) falls back to the table', (saved) => {
  const { storage } = fakeStorage({ 'scrobble-cast:books:view': saved })

  expect(viewSetting(storage, 'books').get()).toBe('table')
})

test('storage that throws gives the table, and a choice still holds for the page', () => {
  const throwing = {
    getItem(): string | null { throw new Error('SecurityError') },
    setItem() { throw new Error('SecurityError') },
  }
  const setting = viewSetting(throwing, 'books')
  expect(setting.get()).toBe('table')

  setting.set('large')

  expect(setting.get()).toBe('large')
})

test('each list keeps its own view', () => {
  const { storage } = fakeStorage()
  viewSetting(storage, 'books').set('large')

  expect(viewSetting(storage, 'podcasts').get()).toBe('table')
  expect(viewSetting(storage, 'books').get()).toBe('large')
})

test('a narrow screen shows small cards for large ones, and offers no large', () => {
  expect(viewOn('large', true)).toBe('small')
  expect(viewOn('table', true)).toBe('table')
  expect(viewOn('small', true)).toBe('small')
  expect(viewsOn(true)).toEqual(['table', 'small'])
})

test('a wide screen shows every view as chosen', () => {
  expect(viewOn('large', false)).toBe('large')
  expect(viewsOn(false)).toEqual(['table', 'small', 'large'])
})
