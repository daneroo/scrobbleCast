// The reader's theme setting: a theme and a mode setting, saved per device in
// localStorage. Shaped like the notice board: read it, cycle it, subscribe to
// changes. It applies itself to the page (the theme attribute and `.dark`
// class on <html>, `color-scheme`, the theme-color meta), and with the mode
// setting at system it follows the device's dark setting, also while open.

export const themes = ['pantone', 'chromatic', 'sketch', 'prosodio'] as const
export type Theme = (typeof themes)[number]

// Light or dark, or system: follow the device.
export const modeSettings = ['light', 'dark', 'system'] as const
export type ModeSetting = (typeof modeSettings)[number]

export interface Setting {
  theme: Theme
  mode: ModeSetting
}

const defaults: Setting = { theme: 'pantone', mode: 'system' }

// Where the setting is saved, in localStorage.
const keys = { theme: 'scrobble-cast:theme', mode: 'scrobble-cast:mode' } as const

// The browser bar's colour (theme-color, for Chrome on Android): each theme's
// header, light then dark, as in theme.css.
const barColors: Record<Theme, readonly [light: string, dark: string]> = {
  pantone: ['#1d4e89', '#1d4e89'],
  chromatic: ['#1b3a6b', '#0f1d3a'],
  sketch: ['#33302a', '#0b0a09'],
  prosodio: ['#1e3256', '#132548'], // oklch(0.32 0.07 262), oklch(0.27 0.07 262)
}

// The device's dark setting, as a media query.
export const deviceDarkQuery = '(prefers-color-scheme: dark)'

export interface ThemeSettingDeps {
  storage: Pick<Storage, 'getItem' | 'setItem'>
  darkQuery: Pick<MediaQueryList, 'matches'> & { addEventListener(type: 'change', listener: () => void): void }
  page: Document
}

// A saved value, if it is one of the known ones. Storage may throw (e.g.
// when the browser blocks it), which reads as nothing saved.
function load<T extends string>(storage: ThemeSettingDeps['storage'], key: string, known: readonly T[]) {
  try {
    const value = storage.getItem(key)
    return known.find((name) => name === value)
  } catch {
    return undefined
  }
}

// The name after `current`, wrapping at the end.
const next = <T,>(names: readonly T[], current: T) => names[(names.indexOf(current) + 1) % names.length]

export function themeSetting({ storage, darkQuery, page }: ThemeSettingDeps) {
  let setting: Setting = {
    theme: load(storage, keys.theme, themes) ?? defaults.theme,
    mode: load(storage, keys.mode, modeSettings) ?? defaults.mode,
  }
  const apply = () => {
    const dark = setting.mode === 'system' ? darkQuery.matches : setting.mode === 'dark'
    const root = page.documentElement
    root.dataset.theme = setting.theme
    root.classList.toggle('dark', dark)
    root.style.colorScheme = dark ? 'dark' : 'light'
    page.querySelector('meta[name="theme-color"]')?.setAttribute('content', barColors[setting.theme][dark ? 1 : 0])
  }
  const save = (key: string, value: string) => {
    try {
      storage.setItem(key, value)
    } catch {
      // Not saved: the setting holds for this page only.
    }
  }
  const listeners = new Set<() => void>()
  const change = (key: keyof Setting, changed: Setting) => {
    setting = changed
    save(keys[key], setting[key])
    apply()
    for (const listener of listeners) listener()
  }
  apply()
  // The device changed: the setting hasn't, so subscribers aren't told.
  darkQuery.addEventListener('change', apply)
  return {
    get: () => setting,
    cycleTheme() {
      change('theme', { ...setting, theme: next(themes, setting.theme) })
    },
    cycleMode() {
      change('mode', { ...setting, mode: next(modeSettings, setting.mode) })
    },
    subscribe(listener: () => void) {
      listeners.add(listener)
      return () => { listeners.delete(listener) }
    },
  }
}

// The setting applied before the page first paints, inlined in the head of
// index.html (see vite.config.ts), so the wrong theme never flashes. It is
// built from the names and values above and does what themeSetting does on
// load; theme.test.ts runs it against the module.
const json = JSON.stringify
export const beforePaintScript = `(function () {
  var theme = ${json(defaults.theme)}, mode = ${json(defaults.mode)}
  try {
    var saved = localStorage.getItem(${json(keys.theme)})
    if (${json(themes)}.indexOf(saved) >= 0) theme = saved
    saved = localStorage.getItem(${json(keys.mode)})
    if (${json(modeSettings)}.indexOf(saved) >= 0) mode = saved
  } catch (e) {}
  var dark = mode === "system" ? matchMedia(${json(deviceDarkQuery)}).matches : mode === "dark"
  var root = document.documentElement
  root.dataset.theme = theme
  root.classList.toggle("dark", dark)
  root.style.colorScheme = dark ? "dark" : "light"
  var bar = document.querySelector('meta[name="theme-color"]')
  if (bar) bar.setAttribute("content", ${json(barColors)}[theme][dark ? 1 : 0])
})()`
