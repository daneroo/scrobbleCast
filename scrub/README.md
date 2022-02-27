# Scrobble Cast Scrub

Start to extract all data through existing API.

We also have a NDJson, or `.jsonl` archive of all items. e.g.:
`data/snapshots/monthly/daniel/monthly-daniel-2021-09-01T00:00:00Z.jsonl`

- from `/api/items?user=..&type=..&since=..&before=..` - in snapshot order

## TODO

- compare fetched history, with merged objects : podcasts first
- validate: make single stream, use AJV parser
  - annotate the source from ? jsonl/api
- extend classify to count by user/sourceType/values for fields, or value types
- make sources async iterators: (current `.jsonl`)
  - read http/api (history/items)
  - read sqlite:<https://deno.land/x/sqlite@v3.1.1>
- `cue/scrobble-schema.cue`: not done for episodes

## Scrubbing

- make sure we have all content
  - get all items for a month
  - compare with ndjson
  - make sure digest can be calculated anew!
- Make sure history in non-redundant
  - We think we have a bug!

## Cue lang

- See [`./cue/README.md`](./cue/README.md)

## Deno land

```bash
deno run -A --unstable validate.ts
deno run -A --unstable walkAndFetch.ts

deno test --unstable
```

### Dependency Management

See [Deno: Locks and Integraity](https://deno.land/manual/linking_to_external_code/integrity_checking)

Check outdated deps

```bash
## permissive
deno run -A https://deno.land/x/udd/main.ts --dry-run src/deps.ts
## check other deps (not in deps.ts)
deno run -A https://deno.land/x/udd/main.ts --dry-run src/*.ts *.ts
## strict - permissions and pinned udd version - could put udd in deps?!
deno run --allow-net --allow-read=./  https://deno.land/x/udd@0.5.0/main.ts --dry-run src/*.ts
```

## Export to Git

- Extract podcast only, turn into git history
- Then episodes
- Then user play/start history

## Items (podcasts and episodes)

These include both podcasts and episodes

- All items can be fetched by individual digest.
- We can fetch a list of digests in a time range

```bash
# 1 month's podcast items≈
curl -s 'http://dirac:8000/api/items?user=daniel&type=podcast&since=2021-05-01&before=2021-06-01'| jq
# 1 day's episode items
curl -s 'http://dirac:8000/api/items?user=daniel&type=episode&since=2021-05-16&before=2021-05-17'| jq '. | length'
```

## History

```bash
# all podcasts (ordered by?) - extract uuid
curl -s 'http://dirac:8000/api/history?type=podcast&user=daniel'|jq .[].uuid
# single podcast by uuid
curl -s 'http://dirac:8000/api/history?type=podcast&user=daniel&uuid=86e084d0-1dae-012e-01b5-00163e1b201c'|jq
```
