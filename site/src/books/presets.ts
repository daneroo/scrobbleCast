// The books presets: one-click starting queries. Nothing else lives here.
//
// To add one, add an entry to the list below:
//
//   { label: 'Short and loved', hint: 'Five stars, under 200 pages', query: 'rating:5 pages:<200 sort:-read' },
//
// - `label`: the button's text and its journal lane's title. Keep it short.
// - `hint`: one sentence on what it finds, shown under the lane's title.
// - `query`: exactly what typing in the query line would be. Its syntax is
//   the page's "Query help" (or the fields in `list.tsx`). The query line
//   highlights the preset when its text is exactly this.
// - `excludeFromJournalLanes: true` (optional): a button only, with no lane
//   in the journal (the overview shown when the query is empty). Use it for
//   broad or chore-like queries.
//
// Order matters: the buttons and the journal's lanes follow this list's
// order.
//
// `presets.test.ts` parses every query, so `npm test` catches a token the
// query line wouldn't understand.

import type { Preset } from '../list/query'

// This year, from the clock when the page loads.
const thisYear = String(new Date().getFullYear())

export const bookPresets: readonly Preset[] = [
  { label: 'Reading now', hint: 'On the currently-reading shelf, latest activity first', query: 'shelf:currently-reading sort:-updated' },
  { label: 'Recent 5★', hint: 'My five-star books, most recently read first', query: 'rating:5 sort:-read' },
  { label: 'On deck, best first', hint: 'On-deck books by Goodreads average rating', query: 'shelf:on-deck sort:-avg,-added' },
  { label: 'Quick next read', hint: 'On deck, under 300 pages, best average first', query: 'shelf:on-deck pages:<300 sort:-avg,pages' },
  { label: `Read in ${thisYear}`, hint: `Finished in ${thisYear}, latest first`, query: `year:${thisYear} sort:-read` },
  { label: 'Re-reads', hint: 'Books I read more than once', query: 'reads:>=2 sort:-reads,-read' },
  { label: 'Me vs. everyone', hint: 'Where my rating and the average disagree by 0.8 or more', query: 'gap:>=0.8 sort:-gap' },
  { label: 'To-read gems', hint: 'To-read books rated 4.3 or more on average', query: 'shelf:to-read avg:>=4.3 sort:-avg' },
  { label: 'Longest waiting', hint: 'To-read and on-deck books, oldest added first', query: 'shelf:to-read,on-deck sort:added' },
  { label: 'Read, unrated', hint: 'Read but never rated, latest first', query: 'shelf:read rating:0 sort:-read', excludeFromJournalLanes: true },
  { label: 'Everything', hint: 'All books, latest activity first', query: 'sort:-updated', excludeFromJournalLanes: true },
]
