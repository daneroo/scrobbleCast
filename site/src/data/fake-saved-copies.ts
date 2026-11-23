import type { SavedCopies } from './fetch'

// A fake saved-copy store for tests: the body saved for each URL. It logs
// each URL read or written.
export function fakeSavedCopies(bodies: Record<string, unknown> = {}) {
  const used: string[] = []
  const saved: SavedCopies = {
    async get(url) {
      used.push(url)
      return url in bodies ? new Response(JSON.stringify(bodies[url])) : undefined
    },
    async put(url, response) {
      used.push(url)
      bodies[url] = await response.json()
    },
    async delete(url) { delete bodies[url] },
  }
  return { bodies, used, saved }
}
