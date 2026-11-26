// The podcasts presets: one-click starting queries. Nothing else lives here.
//
// To add one, add an entry to the list below:
//
//   { label: 'Most listened', hint: 'Most time listened in the window', query: 'listened:>0 sort:-listened' },
//
// - `label`: the button's text and its journal lane's title. Keep it short.
// - `hint`: one sentence on what it finds, shown under the lane's title.
// - `query`: exactly what typing in the query line would be. Its syntax is
//   the page's "Query help" (or the fields in `list.tsx`). The query line
//   highlights the preset when its text is exactly this.
// - `excludeFromJournalLanes: true` (optional): a button only, with no lane
//   in the journal (what the list shows when the query is empty). Use it
//   for broad or chore-like queries.
//
// Order matters: the buttons and the journal's lanes follow this list's
// order.
//
// `presets.test.ts` parses every query, so `npm test` catches a token the
// query line wouldn't understand.

import type { Preset } from '../list/query'

export const podcastPresets: readonly Preset[] = [
  { label: 'Recently played', hint: 'Podcasts played in the window, latest first', query: 'plays:>0 sort:-played' },
  { label: 'Most played', hint: 'Most episodes played in the window', query: 'plays:>0 sort:-plays', excludeFromJournalLanes: true },
  { label: 'Most listened', hint: 'Most time listened in the window', query: 'listened:>0 sort:-listened' },
  { label: 'Newly added', hint: 'Latest subscriptions first', query: 'sort:-added', excludeFromJournalLanes: true },
  { label: 'Unplayed in window', hint: 'Podcasts with no plays in the window', query: 'plays:0 sort:title', excludeFromJournalLanes: true },
  { label: 'Everything', hint: 'Every podcast, A to Z', query: 'sort:title', excludeFromJournalLanes: true },
]
