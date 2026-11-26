# Scrobble Cast

A personal record of podcasts listened to and books read, scraped from Pocket Casts and Goodreads.

## Language

**Book**:
One book on the user's Goodreads shelves: one entry in the books feed. Upstream (`scrobble-books-data`) separates edition, work and review; here it is just a Book.
_Avoid_ as names for it: Edition, Entry, Item, Work ("entry" is fine as a plain word)

**Feed**:
One upstream download the site loads whole: the books feed (Goodreads, from S3), the podcast feed (the podcast catalog) or the episode feed (episodes that changed recently: played, or just published), the latter two from the history API.
_Avoid_: Payload, dataset, history (for the download itself)

**Feed time**:
How fresh a feed is, shown in the footer: `updated` for the books feed (when S3 last modified it), **Last change** for the podcast and episode feeds. A lookup of one record by `uuid` is not a feed and has no feed time.
_Avoid_: Fetch time, load time

**Saved copy**:
The last copy of a feed kept in the browser, shown at once and replaced when a fresh copy arrives.
_Avoid_: Cache (too generic), snapshot

**Last change**:
The newest time the scraper saw any record in a podcast or episode feed change. A scrape that changes nothing leaves it as is, so it is not the time of the last scrape.
_Avoid_: Last fetch, last scrape, generated at

**Theme**:
A named look for the whole site (pantone, chromatic, sketch, prosodio), chosen by the reader. Every theme has both modes.
_Avoid_: Palette, skin, colourway

**Mode**:
Light or dark, within a theme. The reader picks light, dark or system; system follows the device and is a setting, not a third mode.
_Avoid_: Appearance, scheme

**Window**:
How far back the loaded episode feed reaches: episodes that changed since a day, shown on the page. The reader can widen it further back. Podcasts' plays and listening time count only episodes in the window.
_Avoid_: Range, period, page (for the window)

**Status**:
Where I am with an episode, as Pocket Casts records it: unplayed, in progress or finished. Finished is Pocket Casts' own mark, not a share of the episode played: a finished episode can stop short of its end.
_Avoid_: Played (for finished), state

### List pages

The books, podcasts and episodes lists share these terms.

**Query**:
The one line that selects and orders a list: words to search, `key:value` filters, `sort:` and `show:`.
_Avoid_: Filter bar, search (for the whole line; the words alone are the search)

**Preset**:
A named query, fixed in code, that fills the query line when picked.
_Avoid_: Saved search, view, favourite

**Journal**:
What a list shows when its query is empty: one **lane** per preset, in the presets' order, each lane a short row of that preset's results with a way to open it in full.
_Avoid_: Dashboard, overview, shelf (for a lane)

**View**:
How a list shows a query's results: table, small cards or large cards.
_Avoid_: Layout, mode (mode is light or dark)
