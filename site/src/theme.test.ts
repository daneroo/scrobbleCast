// @vitest-environment happy-dom
import { expect, test } from 'vite-plus/test'
import type { ThemeSettingDeps } from './theme'
import { beforePaintScript, deviceDarkQuery, modeSettings, themeSetting, themes } from './theme'

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

// A fake of the device's dark setting (a `prefers-color-scheme: dark` query),
// which the test can flip.
function fakeDevice(dark: boolean) {
  const listeners = new Set<() => void>()
  const darkQuery = {
    matches: dark,
    addEventListener: (_: 'change', listener: () => void) => { listeners.add(listener) },
    removeEventListener: (_: 'change', listener: () => void) => { listeners.delete(listener) },
  }
  return {
    darkQuery,
    setDark(next: boolean) {
      darkQuery.matches = next
      for (const listener of listeners) listener()
    },
  }
}

// A fresh page, with the head's theme-color as index.html has it.
function freshPage() {
  const page = document.implementation.createHTMLDocument('')
  page.head.innerHTML = '<meta name="theme-color" content="#1d4e89">'
  return page
}

// What the reader gets: the theme and mode on the page.
function look(page: Document) {
  const root = page.documentElement
  return {
    theme: root.dataset.theme,
    dark: root.classList.contains('dark'),
    colorScheme: root.style.colorScheme,
    themeColor: page.querySelector('meta[name="theme-color"]')?.getAttribute('content'),
  }
}

// Storage the browser blocks: every use throws.
const throwing = {
  getItem(): string | null { throw new Error('SecurityError') },
  setItem() { throw new Error('SecurityError') },
}

// Storage where reading the theme throws but the mode is saved as dark.
const themeReadThrows = {
  getItem(key: string): string | null {
    if (key === 'scrobble-cast:theme') throw new Error('SecurityError')
    return key === 'scrobble-cast:mode' ? 'dark' : null
  },
  setItem() {},
}

test('a first visit is pantone, following a light device', () => {
  const page = freshPage()

  const setting = themeSetting({ storage: fakeStorage().storage, darkQuery: fakeDevice(false).darkQuery, page })

  expect(setting.get()).toEqual({ theme: 'pantone', mode: 'system' })
  expect(look(page)).toEqual({ theme: 'pantone', dark: false, colorScheme: 'light', themeColor: '#1d4e89' })
})

test('a first visit on a dark device is pantone dark', () => {
  const page = freshPage()

  themeSetting({ storage: fakeStorage().storage, darkQuery: fakeDevice(true).darkQuery, page })

  expect(look(page)).toEqual({ theme: 'pantone', dark: true, colorScheme: 'dark', themeColor: '#1d4e89' })
})

test('a saved theme and mode load as saved', () => {
  const page = freshPage()
  const { storage } = fakeStorage({ 'scrobble-cast:theme': 'chromatic', 'scrobble-cast:mode': 'dark' })

  const setting = themeSetting({ storage, darkQuery: fakeDevice(false).darkQuery, page })

  expect(setting.get()).toEqual({ theme: 'chromatic', mode: 'dark' })
  expect(look(page)).toEqual({ theme: 'chromatic', dark: true, colorScheme: 'dark', themeColor: '#0f1d3a' })
})

test('an unknown or garbled saved value falls back to the default, on its own', () => {
  const page = freshPage()
  const { storage } = fakeStorage({ 'scrobble-cast:theme': 'solarized', 'scrobble-cast:mode': 'dark' })

  expect(themeSetting({ storage, darkQuery: fakeDevice(false).darkQuery, page }).get()).toEqual({ theme: 'pantone', mode: 'dark' })

  const garbled = fakeStorage({ 'scrobble-cast:theme': 'sketch', 'scrobble-cast:mode': '{"mode":"dark"' }).storage
  expect(themeSetting({ storage: garbled, darkQuery: fakeDevice(false).darkQuery, page }).get()).toEqual({ theme: 'sketch', mode: 'system' })
})

test('storage that throws gives the default, and cycling still works', () => {
  const page = freshPage()

  const setting = themeSetting({ storage: throwing, darkQuery: fakeDevice(true).darkQuery, page })
  expect(setting.get()).toEqual({ theme: 'pantone', mode: 'system' })
  expect(look(page)).toMatchObject({ theme: 'pantone', dark: true })

  setting.cycleTheme()
  expect(setting.get()).toEqual({ theme: 'chromatic', mode: 'system' })
})

test('cycling the theme visits all four, wraps, and is saved', () => {
  const page = freshPage()
  const { saved, storage } = fakeStorage()
  const setting = themeSetting({ storage, darkQuery: fakeDevice(false).darkQuery, page })

  const visited = [0, 1, 2, 3].map(() => {
    setting.cycleTheme()
    return [setting.get().theme, look(page).theme, look(page).themeColor]
  })

  expect(visited).toEqual([
    ['chromatic', 'chromatic', '#1b3a6b'],
    ['sketch', 'sketch', '#33302a'],
    ['prosodio', 'prosodio', '#1e3256'],
    ['pantone', 'pantone', '#1d4e89'],
  ])
  expect(saved).toEqual({ 'scrobble-cast:theme': 'pantone' })
})

test('cycling the mode goes light, dark, system, light, and is saved', () => {
  const page = freshPage()
  const { saved, storage } = fakeStorage()
  const setting = themeSetting({ storage, darkQuery: fakeDevice(true).darkQuery, page })

  const visited = [0, 1, 2, 3].map(() => {
    setting.cycleMode()
    return [setting.get().mode, look(page).dark, saved['scrobble-cast:mode']]
  })

  expect(visited).toEqual([
    ['light', false, 'light'],
    ['dark', true, 'dark'],
    ['system', true, 'system'],
    ['light', false, 'light'],
  ])
})

test('a saved choice is what the next visit gets', () => {
  const { storage } = fakeStorage()
  const first = themeSetting({ storage, darkQuery: fakeDevice(false).darkQuery, page: freshPage() })
  first.cycleTheme()
  first.cycleMode()

  const page = freshPage()
  const second = themeSetting({ storage, darkQuery: fakeDevice(false).darkQuery, page })

  expect(second.get()).toEqual({ theme: 'chromatic', mode: 'light' })
  expect(look(page)).toEqual({ theme: 'chromatic', dark: false, colorScheme: 'light', themeColor: '#1b3a6b' })
})

test('subscribers hear each change', () => {
  const setting = themeSetting({ storage: fakeStorage().storage, darkQuery: fakeDevice(false).darkQuery, page: freshPage() })
  const heard: unknown[] = []
  const unsubscribe = setting.subscribe(() => heard.push(setting.get()))

  setting.cycleTheme()
  setting.cycleMode()
  unsubscribe()
  setting.cycleMode()

  expect(heard).toEqual([{ theme: 'chromatic', mode: 'system' }, { theme: 'chromatic', mode: 'light' }])
})

test('with system, the page follows the device while open', () => {
  const page = freshPage()
  const device = fakeDevice(false)
  themeSetting({ storage: fakeStorage().storage, darkQuery: device.darkQuery, page })

  device.setDark(true)
  expect(look(page)).toMatchObject({ dark: true, colorScheme: 'dark' })

  device.setDark(false)
  expect(look(page)).toMatchObject({ dark: false, colorScheme: 'light' })
})

test('with a forced mode, a change of the device does nothing', () => {
  const page = freshPage()
  const device = fakeDevice(false)
  themeSetting({ storage: fakeStorage({ 'scrobble-cast:mode': 'light' }).storage, darkQuery: device.darkQuery, page })

  device.setDark(true)

  expect(look(page)).toMatchObject({ dark: false, colorScheme: 'light' })
})

test('system, then forced, then system again: the device is followed only while system', () => {
  const page = freshPage()
  const device = fakeDevice(false)
  const setting = themeSetting({ storage: fakeStorage().storage, darkQuery: device.darkQuery, page })

  setting.cycleMode()
  setting.cycleMode()
  expect(setting.get().mode).toBe('dark')
  device.setDark(true)
  device.setDark(false)
  expect(look(page)).toMatchObject({ dark: true, colorScheme: 'dark' })

  setting.cycleMode()
  expect(setting.get().mode).toBe('system')
  expect(look(page)).toMatchObject({ dark: false, colorScheme: 'light' })
  device.setDark(true)
  expect(look(page)).toMatchObject({ dark: true, colorScheme: 'dark' })
})

test('once disposed, the setting no longer follows the device', () => {
  const page = freshPage()
  const device = fakeDevice(false)
  const setting = themeSetting({ storage: fakeStorage().storage, darkQuery: device.darkQuery, page })

  setting.dispose()
  device.setDark(true)

  expect(look(page)).toMatchObject({ dark: false })
})

// Runs the before-paint script on a page, as the browser would in its head.
function runBeforePaint(page: Document, storage: ThemeSettingDeps['storage'], darkQuery: { matches: boolean }) {
  const matchMedia = (query: string) => {
    expect(query).toBe(deviceDarkQuery)
    return darkQuery
  }
  new Function('document', 'localStorage', 'matchMedia', beforePaintScript)(page, storage, matchMedia)
}

test.each([
  ['a first visit, light device', {}, false],
  ['a first visit, dark device', {}, true],
  ['a saved theme and system mode', { 'scrobble-cast:theme': 'sketch', 'scrobble-cast:mode': 'system' }, true],
  ['a saved light mode on a dark device', { 'scrobble-cast:theme': 'prosodio', 'scrobble-cast:mode': 'light' }, true],
  ['a saved dark mode on a light device', { 'scrobble-cast:theme': 'chromatic', 'scrobble-cast:mode': 'dark' }, false],
  ['unknown and garbled values', { 'scrobble-cast:theme': 'solarized', 'scrobble-cast:mode': '"dark"' }, true],
  ['storage that throws', 'throws', true],
  ['the theme read throws, the mode is saved', 'theme read throws', false],
] as const)('the before-paint script gives the page the module’s look: %s', (_, saved, dark) => {
  const storage = () =>
    saved === 'throws' ? throwing : saved === 'theme read throws' ? themeReadThrows : fakeStorage({ ...saved }).storage
  const painted = freshPage()
  const loaded = freshPage()

  runBeforePaint(painted, storage(), { matches: dark })
  themeSetting({ storage: storage(), darkQuery: fakeDevice(dark).darkQuery, page: loaded })

  expect(look(painted)).toEqual(look(loaded))
})

test('every theme and mode looks the same from the before-paint script as from the module', () => {
  for (const theme of themes) {
    for (const mode of modeSettings) {
      const saved = { 'scrobble-cast:theme': theme, 'scrobble-cast:mode': mode }
      const painted = freshPage()
      const loaded = freshPage()

      runBeforePaint(painted, fakeStorage({ ...saved }).storage, { matches: true })
      themeSetting({ storage: fakeStorage({ ...saved }).storage, darkQuery: fakeDevice(true).darkQuery, page: loaded })

      expect(look(painted)).toEqual(look(loaded))
    }
  }
})
