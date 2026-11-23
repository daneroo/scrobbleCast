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

// Download a URL and check it against its schema: a whole feed, or one record
// looked up by `uuid`.
export async function loadJson<T>(url: string, label: string, schema: z.ZodType<T>, download: Download = fetch) {
  const response = await download(url)
  if (!response.ok) throw new Error(`Could not load ${label} (HTTP ${response.status}).`)
  const result = schema.safeParse(await response.json())
  if (result.success) return { data: result.data, headers: response.headers }
  const { issues } = result.error
  const more = issues.length > maxShownIssues ? `\n…and ${issues.length - maxShownIssues} more` : ''
  throw new Error(`The ${label} don't match the schema:\n${z.prettifyError(new z.ZodError(issues.slice(0, maxShownIssues)))}${more}`)
}

export type FeedName = 'books' | 'podcasts' | 'episodes'

// How fresh a feed is: `updated` when it was generated, or its `last change`,
// the newest change the scraper saw. `at` is missing if the feed doesn't say.
export interface FeedTime {
  label: 'updated' | 'last change'
  at: Date | undefined
}

export interface Feed<T> {
  name: FeedName
  data: T
  time: FeedTime
}

// Where a feed comes from, and how to tell its time from its headers or data.
export interface FeedSource<T> {
  name: FeedName
  url: string
  schema: z.ZodType<T>
  time: (data: T, headers: Headers) => FeedTime
}

// Load a whole feed, with its time.
export async function loadFeed<T>(source: FeedSource<T>, download?: Download): Promise<Feed<T>> {
  const { data, headers } = await loadJson(source.url, source.name, source.schema, download)
  const feed = { name: source.name, data, time: source.time(data, headers) }
  setFeedTime(feed.name, feed.time)
  return feed
}

// The time of each feed last loaded in this tab, for the footer.
let feedTimes: Partial<Record<FeedName, FeedTime>> = {}
const listeners = new Set<() => void>()

function setFeedTime(name: FeedName, time: FeedTime) {
  feedTimes = { ...feedTimes, [name]: time }
  for (const listener of listeners) listener()
}

export function getFeedTimes() {
  return feedTimes
}

export function subscribeFeedTimes(listener: () => void) {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

// Share in-flight and recent requests across routes in the current tab.
// `loaded()` gives the data if it has already arrived and is still recent.
export function cached<T>(load: () => Promise<T>, ttl = cacheTtlMs) {
  let entry: { expires: number; promise: Promise<T>; data?: T } | undefined
  const fresh = () => (entry && entry.expires > Date.now() ? entry : undefined)
  const get = () => {
    const current = fresh()
    if (current) return current.promise
    const next: NonNullable<typeof entry> = { expires: Date.now() + ttl, promise: load() }
    next.promise = next.promise.then(
      (data) => {
        next.data = data
        return data
      },
      (error) => {
        if (entry === next) entry = undefined
        throw error
      },
    )
    entry = next
    return next.promise
  }
  return Object.assign(get, { loaded: () => fresh()?.data })
}
