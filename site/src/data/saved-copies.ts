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
