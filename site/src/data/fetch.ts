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

// How a feed is downloaded: `fetch` in the app, a fake in tests.
export type Download = (url: string) => Promise<Response>

export async function loadFeed<T>(url: string, label: string, schema: z.ZodType<T>, download: Download = fetch): Promise<T> {
  const response = await download(url)
  if (!response.ok) throw new Error(`Could not load ${label} (HTTP ${response.status}).`)
  const result = schema.safeParse(await response.json())
  if (result.success) return result.data
  const { issues } = result.error
  const more = issues.length > maxShownIssues ? `\n…and ${issues.length - maxShownIssues} more` : ''
  throw new Error(`The ${label} don't match the schema:\n${z.prettifyError(new z.ZodError(issues.slice(0, maxShownIssues)))}${more}`)
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
