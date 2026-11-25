# Books list prototype: verdict

Branch `prototype/layout` (throwaway, never merges). Code: `books.prototype.tsx`, shown on `/books` in dev builds only.

## Question

What should the books list look like: which fields, how to search, filter and order, and how to present results?

## Tried

A premade views over a dense table; B general facets and sort-by-any-field over large cover cards; C a reading journal of lanes, one premade query each; D one query line whose presets fill it in. All are in this branch's history (`1e914b8`).

## Verdict

S, a synthesis, won and is what this branch now holds:

- **Selection:** D's query line. Bare words fuzzy-search title, author and description. `key:value` filters (`shelf:on-deck pages:<300 rating:>=4 year:2025 gap:>=0.8`); `sort:-avg,-added` is a comma list where minus means high first and later fields break ties; `show:avg,pages` sets the fields shown.
- **Presets are saved queries,** tailored to the reader. A click fills the query line, to tune there. The list is in `presets`.
- **Fields shown follow the query:** shelf (unless one shelf), progress (when reading), the filtered and sorted fields, then defaults for the shelf, up to 4. `show:` overrides.
- **Empty query:** C's journal, one lane of small cards per preset; "See all" opens the preset's query.
- **Results, switchable:** A's table (a header click rewrites `sort:`, a row click expands the book in place), C's small cards, or B's large cards (with progress over the cover).
- **Covers:** `._SY75_` → `._SY300_` gives 199×300; with no suffix, 315×475.

## For the implementer

- **Isolate the query model for reuse** in other lists (podcasts, episodes). A generic part over any item type holds:
  - one field registry (key, aliases, label, kind, value, cell and short renderers; the kind sets the filter operators);
  - the query parser and serializer;
  - running a query (search, filter, sort);
  - choosing columns;
  - presets, and help text generated from the registry.

  Each list supplies only its fields, search keys, defaults rule and presets. The prototype splits filter keys, aliases and the field-to-column mapping across three tables; one registry replaces them.
- **One `BookCard` with a size** instead of `SmallCard` and `LargeCard`.
- **Labels match keywords**, so a header tells you what to type: "Mine" becomes "Rating"; `year:` filters last read.
- **Not reachable from the query:** `userReview`, `isbn` and the rest of `timeline`. They only show in the expanded row.
- **No component library or TanStack Table needed.** The table is about 60 lines of plain JSX plus roles; sort state lives in the query.
