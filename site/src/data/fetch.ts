import { z } from 'zod'
import { cacheTtlMs } from '../config'

// Parse failures list only the first few issues: one upstream change can
// break every record.
const maxShownIssues = 3

export function plainText(html: string) {
  if (!html) return ''
  const template = document.createElement('template')
  template.innerHTML = html.replace(/<br\s*\/?>|<\/(?:p|div)>/gi, '\n')
  return template.content.textContent?.trim() ?? ''
}

// How a URL is downloaded: `fetch` in the app, a fake in tests.
export type Download = (url: string) => Promise<Response>

// Check a response against its schema.
async function parse<T>(response: Response, label: string, schema: z.ZodType<T>) {
  if (!response.ok) throw new Error(`Could not load ${label} (HTTP ${response.status}).`)
  const result = schema.safeParse(await response.json())
  if (result.success) return result.data
  const { issues } = result.error
  const more = issues.length > maxShownIssues ? `\n…and ${issues.length - maxShownIssues} more` : ''
  throw new Error(`The ${label} don't match the schema:\n${z.prettifyError(new z.ZodError(issues.slice(0, maxShownIssues)))}${more}`)
}

// Download a URL and check it against its schema: a whole feed, or one record
// looked up by `uuid`.
export async function loadJson<T>(url: string, label: string, schema: z.ZodType<T>, download: Download = fetch) {
  const response = await download(url)
  return { data: await parse(response, label, schema), headers: response.headers }
}

// Where the browser keeps saved copies of feeds: the raw responses, by URL.
export interface SavedCopies {
  get(url: string): Promise<Response | undefined>
  put(url: string, response: Response): Promise<void>
  delete(url: string): Promise<void>
}

// The browser's Cache API. It only exists in secure contexts: without it no
// copy is saved.
export const browserSavedCopies: SavedCopies = {
  async get(url) { return (await openSavedCopies())?.match(url, { ignoreVary: true }) },
  async put(url, response) { await (await openSavedCopies())?.put(url, response) },
  async delete(url) { await (await openSavedCopies())?.delete(url, { ignoreVary: true }) },
}

function openSavedCopies() {
  return typeof caches === 'undefined' ? undefined : caches.open('saved-copies')
}

export interface FeedOptions {
  download?: Download
  saved?: SavedCopies
}

export type FeedName = 'books' | 'podcasts' | 'episodes'

// How fresh a feed is: `updated` when it was generated, or its `last change`,
// the newest change the scraper saw. `at` is missing if the feed doesn't say.
export interface FeedTime {
  label: 'updated' | 'last change'
  at: Date | undefined
}

// One copy of a feed: from the browser's saved copy, or freshly downloaded.
export interface Feed<T> {
  name: FeedName
  data: T
  time: FeedTime
  source: 'saved' | 'fresh'
}

// Where a feed comes from, how to tell its time from its headers or data, and
// whether the browser keeps a saved copy of it.
export interface FeedConfig<T> {
  name: FeedName
  url: string
  schema: z.ZodType<T>
  time: (data: T, headers: Headers) => FeedTime
  save?: boolean
}

// Load a whole feed: its saved copy at once if there is a usable one, then the
// fresh copy, which replaces the saved copy. A failed refresh keeps the saved
// copy; with no saved copy it raises.
export async function* loadFeed<T>(
  config: FeedConfig<T>,
  { download = fetch, saved = browserSavedCopies }: FeedOptions = {},
): AsyncGenerator<Feed<T>> {
  const copy = async (response: Response, source: Feed<T>['source']): Promise<Feed<T>> => {
    const data = await parse(response, config.name, config.schema)
    return { name: config.name, data, time: config.time(data, response.headers), source }
  }

  // Always fetch the feed, even while the saved copy is read.
  const fresh = download(config.url).then(async (response) => {
    const raw = config.save ? response.clone() : undefined
    const feed = await copy(response, 'fresh')
    if (raw) saved.put(config.url, raw).catch(() => {})
    return feed
  })
  fresh.catch(() => {}) // Awaited below, after the saved copy.

  let savedCopy: Feed<T> | undefined
  if (config.save) {
    const response = await saved.get(config.url).catch(() => undefined)
    if (response) {
      try {
        savedCopy = await copy(response, 'saved')
      } catch {
        saved.delete(config.url).catch(() => {}) // It no longer matches the schema.
      }
    }
  }
  if (savedCopy) yield savedCopy

  let freshCopy: Feed<T>
  try {
    freshCopy = await fresh
  } catch (error) {
    if (savedCopy) return
    throw error
  }
  yield freshCopy
}

// A promise of data already loaded: React's `use()` reads its `status` and
// `value` without suspending, so the page shows it at once.
export function ready<T>(value: T): Promise<T> {
  return Object.assign(Promise.resolve(value), { status: 'fulfilled', value })
}

// Share a feed's copies across routes in the current tab. `get()` gives the
// copy shown now: while the first copy loads, a promise of it; then each copy
// as a promise ready at once, so a fresh copy replacing a saved copy doesn't
// suspend the page again. `loaded()` gives the copy shown, if any. A load
// starts again once the copy shown is older than `ttl`.
export function shareFeed<T>(load: () => AsyncIterable<Feed<T>>, ttl = cacheTtlMs) {
  interface Entry { expires: number; promise: Promise<Feed<T>>; feed?: Feed<T> }
  let entry: Entry | undefined
  const current = () => (entry && entry.expires > Date.now() ? entry : undefined)

  const get = () => {
    const found = current()
    if (found) return found.promise
    let resolve!: (feed: Feed<T>) => void
    let reject!: (error: unknown) => void
    const first = new Promise<Feed<T>>((...settle) => { [resolve, reject] = settle })
    const next: Entry = { expires: Date.now() + ttl, promise: first }
    entry = next
    void (async () => {
      try {
        for await (const feed of load()) {
          if (next.feed) next.promise = ready(feed)
          else Object.assign(first, { status: 'fulfilled', value: feed })
          next.feed = feed
          resolve(feed)
          if (entry === next) setShown(feed)
        }
      } catch (error) {
        if (entry === next) entry = undefined
        reject(error)
      }
    })()
    return first
  }
  return Object.assign(get, { loaded: () => current()?.feed })
}

// The copy of each feed shown in this tab, for the footer: its time and
// source. Listeners hear which feed changed.
export type ShownFeed = Pick<Feed<unknown>, 'time' | 'source'>
let shownFeeds: Partial<Record<FeedName, ShownFeed>> = {}
const listeners = new Set<(name: FeedName) => void>()

function setShown({ name, time, source }: Feed<unknown>) {
  shownFeeds = { ...shownFeeds, [name]: { time, source } }
  for (const listener of listeners) listener(name)
}

export function getShownFeeds() {
  return shownFeeds
}

export function subscribeShownFeeds(listener: (name: FeedName) => void) {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}
