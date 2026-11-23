# Scrobble Cast

A personal record of podcasts listened to and books read, scraped from Pocket Casts and Goodreads.

## Language

**Book**:
One book on the user's Goodreads shelves: one entry in the books feed. Upstream (`scrobble-books-data`) separates edition, work and review; here it is just a Book.
_Avoid_ as names for it: Edition, Entry, Item, Work ("entry" is fine as a plain word)

**Feed**:
One upstream download the site loads whole: the books feed (Goodreads, from S3), the podcast feed (the podcast catalog) or the episode feed (recently played episodes), the latter two from the history API.
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
