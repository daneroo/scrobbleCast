export const booksUrl = 'https://im-scrobble-books.s3.amazonaws.com/goodreads.json'
export const historyUrl = 'https://scrobblecast.dl.imetrical.com/api/history'
export const user = 'daniel'

// Episodes listed are those played in the last `recentDays` days.
export const recentDays = 7
// How long fetched data is reused across pages in the same tab.
export const cacheTtlMs = 5 * 60 * 1000

// Fuse's default (0.6) matches almost anything; lower is stricter.
export const searchThreshold = 0.4

export const episodePageSize = 5
export const episodePageStep = 20

// The most books a query draws.
export const bookPageSize = 60
