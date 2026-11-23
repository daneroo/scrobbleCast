import { z } from 'zod'
import { cacheTtlMs } from '../config'
import { localTime } from '../format'
import { notices as appNotices, type NoticeBoard } from '../notices'
import { browserSavedCopies, type SavedCopies } from './saved-copies'

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

export interface FeedOptions {
  download?: Download
  savedCopies?: SavedCopies
  // Where a feed's notices go: the app's notice area, or a board of its own.
  notices?: Pick<NoticeBoard, 'post' | 'clear'>
}

export type FeedName = 'books' | 'podcasts' | 'episodes'

export const feedTitles: Record<FeedName, string> = { books: 'Books', podcasts: 'Podcasts', episodes: 'Episodes' }

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
// copy; with no saved copy it raises. Each feed posts its notices under its
// name.
export async function* loadFeed<T>(
  config: FeedConfig<T>,
  { download = fetch, savedCopies = browserSavedCopies, notices = appNotices }: FeedOptions = {},
): AsyncGenerator<Feed<T>> {
  const warn = (text: string) => notices.post(config.name, { kind: 'warning', text: `${feedTitles[config.name]}: ${text}` })

  const copy = async (response: Response, source: Feed<T>['source']): Promise<Feed<T>> => {
    const data = await parse(response, config.name, config.schema)
    return { name: config.name, data, time: config.time(data, response.headers), source }
  }

  // Always fetch the feed, even while the saved copy is read.
  const fresh = download(config.url).then(async (response) => {
    const raw = config.save ? response.clone() : undefined
    return { feed: await copy(response, 'fresh'), raw }
  })
  fresh.catch(() => {}) // Awaited below, after the saved copy.

  let saved: Feed<T> | undefined
  let discarded = false
  let deleted: Promise<unknown> = Promise.resolve()
  if (config.save) {
    const response = await savedCopies.get(config.url).catch(() => undefined)
    if (response) {
      try {
        saved = await copy(response, 'saved')
      } catch {
        // It no longer matches the schema.
        discarded = true
        deleted = savedCopies.delete(config.url).catch(() => {})
        warn('saved copy discarded (schema mismatch)')
      }
    }
  }
  if (saved) yield saved

  let feed: Feed<T>, raw: Response | undefined
  try {
    ({ feed, raw } = await fresh)
  } catch (error) {
    if (!saved) throw error
    const { at } = saved.time
    warn(`refresh failed, showing saved copy${at ? ` from ${localTime(at)}` : ''}`)
    return
  }
  // Saved once any bad copy is gone, so discarding it can't remove this one.
  if (raw) void deleted.then(() => savedCopies.put(config.url, raw)).catch(() => {})
  // A fresh copy clears the feed's notice. A discard notice stays until the
  // next load, or the fresh copy right behind it would hide it at once.
  if (!discarded) notices.clear(config.name)
  yield feed
}

// Change the data of each copy of a feed, keeping its time and source.
export async function* mapData<T, U>(copies: AsyncIterable<Feed<T>>, change: (data: T) => U): AsyncGenerator<Feed<U>> {
  for await (const feed of copies) yield { ...feed, data: change(feed.data) }
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
// starts again `ttl` after the last copy was shown, or at the next `get()`
// if the refresh failed and only the saved copy is shown. `settled()` gives
// the last copy once the load is over: the fresh copy, or the saved copy if
// the refresh failed.
export function shareFeed<T>(load: () => AsyncIterable<Feed<T>>, ttl = cacheTtlMs) {
  interface Entry { expires: number; promise: Promise<Feed<T>>; done: Promise<Feed<T>>; feed?: Feed<T>; refreshFailed?: boolean }
  let entry: Entry | undefined
  const current = () => (entry && entry.expires > Date.now() ? entry : undefined)

  const get = () => {
    const found = current()
    if (found && !found.refreshFailed) return found.promise
    let resolve!: (feed: Feed<T>) => void
    let reject!: (error: unknown) => void
    const first = new Promise<Feed<T>>((...settle) => { [resolve, reject] = settle })
    let finish!: (feed: Feed<T>) => void
    let fail!: (error: unknown) => void
    const done = new Promise<Feed<T>>((...settle) => { [finish, fail] = settle })
    done.catch(() => {}) // Awaited only by `settled()` callers.
    const next: Entry = { expires: Date.now() + ttl, promise: first, done }
    entry = next
    void (async () => {
      try {
        for await (const feed of load()) {
          const replaced = next.feed !== undefined
          if (replaced) next.promise = ready(feed)
          else Object.assign(first, { status: 'fulfilled', value: feed })
          next.feed = feed
          next.expires = Date.now() + ttl
          resolve(feed)
          if (entry === next) setShown(feed, replaced)
        }
        next.refreshFailed = next.feed?.source === 'saved'
        if (next.feed) finish(next.feed)
        else throw new Error('The feed loaded no copy.')
      } catch (error) {
        if (entry === next) entry = undefined
        reject(error)
        fail(error)
      }
    })()
    return first
  }
  const settled = () => {
    void get()
    return entry!.done
  }
  return Object.assign(get, { loaded: () => current()?.feed, settled })
}

// The copy of each feed shown in this tab, for the footer: its time and
// source. Listeners hear which feed changed, and whether its new copy
// replaced one already shown, e.g. a fresh copy replacing a saved copy.
export type ShownCopy = Pick<Feed<unknown>, 'time' | 'source'>
type ShownListener = (name: FeedName, replaced: boolean) => void
let shownCopies: Partial<Record<FeedName, ShownCopy>> = {}
const listeners = new Set<ShownListener>()

function setShown({ name, time, source }: Feed<unknown>, replaced: boolean) {
  shownCopies = { ...shownCopies, [name]: { time, source } }
  for (const listener of listeners) listener(name, replaced)
}

export function getShownCopies() {
  return shownCopies
}

export function subscribeShownCopies(listener: ShownListener) {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}
