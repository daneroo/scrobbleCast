export const booksUrl = 'https://im-scrobble-books.s3.amazonaws.com/goodreads.json'
export const historyUrl = 'https://scrobblecast.dl.imetrical.com/api/history'
export const user = 'daniel'

// Episodes listed are those played in the last `recentDays` days.
export const recentDays = 7
// How long fetched data is reused across pages in the same tab.
export const cacheTtlMs = 5 * 60 * 1000

// Fuse's default (0.6) matches almost anything; lower is stricter.
export const searchThreshold = 0.4
// Books search long descriptions anywhere in them (`ignoreLocation`), where
// 0.4 lets two words match a third of the books; 0.15 still forgives a typo
// ("excesion banks").
export const booksSearchThreshold = 0.15
// Episodes search their title and their podcast's: 0.15 to start, as books.
export const episodesSearchThreshold = 0.15

// Results a list's query draws at first, and how many more each time the
// reader scrolls near the end.
export const listPageSize = 60
export const listPageStep = 60
// Items in each lane of a list's journal.
export const journalLaneLength = 12
