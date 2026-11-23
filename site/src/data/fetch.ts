import { z } from 'zod'
import { cacheTtlMs } from '../config'

// Parse failures list only the first few issues: one upstream change can
// break every record.
const shownIssues = 3

export function plainText(html: string) {
  if (!html) return ''
  const template = document.createElement('template')
  template.innerHTML = html.replace(/<br\s*\/?>|<\/(?:p|div)>/gi, '\n')
  return template.content.textContent?.trim() ?? ''
}

export async function fetchJson<T>(url: string, label: string, schema: z.ZodType<T>): Promise<T> {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Could not load ${label} (HTTP ${response.status}).`)
  const result = schema.safeParse(await response.json())
  if (result.success) return result.data
  const { issues } = result.error
  const more = issues.length > shownIssues ? `\n…and ${issues.length - shownIssues} more` : ''
  throw new Error(`The ${label} don't match the schema:\n${z.prettifyError(new z.ZodError(issues.slice(0, shownIssues)))}${more}`)
}

// Share in-flight and recent requests across routes in the current tab.
export function cached<T>(load: () => Promise<T>, ttl = cacheTtlMs) {
  let entry: { expires: number; promise: Promise<T> } | undefined
  return () => {
    if (entry && entry.expires > Date.now()) return entry.promise
    const promise = load().catch((error) => {
      if (entry?.promise === promise) entry = undefined
      throw error
    })
    entry = { expires: Date.now() + ttl, promise }
    return promise
  }
}
