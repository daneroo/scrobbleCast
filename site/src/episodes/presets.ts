// The episodes presets: one-click starting queries. Nothing else lives here.
//
// To add one, add an entry to the list below:
//
//   { label: 'In progress', hint: 'Started, not finished, latest played first', query: 'status:in-progress sort:-played' },
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

export const episodePresets: readonly Preset[] = [
  { label: 'In progress', hint: 'Started, not finished, latest played first', query: 'status:in-progress sort:-played' },
  { label: 'Finished recently', hint: 'Finished episodes, latest played first', query: 'status:finished sort:-played' },
  { label: 'Long listens', hint: 'Finished episodes of 1h30m or more, longest first', query: 'status:finished duration:>=1h30m sort:-duration', excludeFromJournalLanes: true },
  { label: 'Stalled', hint: 'Started, under half played, oldest played first', query: 'status:in-progress progress:<50 sort:played', excludeFromJournalLanes: true },
  { label: 'New episodes', hint: 'Not played yet, newest published first', query: 'status:unplayed sort:-published' },
  { label: 'Everything', hint: 'Every episode in the window, latest played first', query: 'sort:-played', excludeFromJournalLanes: true },
]
