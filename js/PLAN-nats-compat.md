# PLAN: scrobblecast ×3 — NATS client compatibility

Tracker: https://github.com/daneroo/im-qcic/issues/313 (checkbox "scrobblecast ×3")
Branch: `nats-compat-313` (pushed for reference, will NOT be merged)

## Question

Does scrobblecast's NATS code, as currently locked (`nats@2.6.1` in
`pnpm-lock.yaml`), work against:

- (a) the pinned Gateway NATS server `synadia/nats-server:nightly-20220224` (2.7.3-beta.3)
- (b) `nats:2.7.2` (switched to and reverted within 15 min on 2022-03-01, reason unknown)
- (c) the latest release `nats:2.15.0` (released 2026-09-17)?

If it doesn't, what exactly fails, and what is the smallest change that lets ONE
build work against both the pinned server and the latest? That change is
reported only, not made.

What we want to show: the three running instances (darwin, d1-px1, scast-hilbert)
keep working after the server is upgraded, with no rebuild and no dependency
change.

## What scrobblecast does with NATS (all in `lib/nats.js`)

| Use                                                                                                 | Code                   | Called from                                                                                     |
| --------------------------------------------------------------------------------------------------- | ---------------------- | ----------------------------------------------------------------------------------------------- |
| Plain publish to `im.scrobblecast.scrape.<subject>`                                                 | `publish()`            | `lib/cron.js` (digest), `lib/tasks.js` (task, progress), `lib/sync.js` (sync.count/trace/error) |
| JetStream stream `scrobblecastDigest` find-or-create (subjects `…digest`, `…digest.>`, max_age 24h) | `findOrCreateStream()` | `lib/logcheck.js` every 10 min, `jetstream-digest.js`                                           |
| JetStream replay: ordered consumer, ack none, `startAtTimeDelta`                                    | `replayMessages()`     | same as above                                                                                   |
| Request/reply scatter                                                                               | `scatter()`            | `discovery.js` (responder: `discovery-client.js`)                                               |

NATS is only for visibility: sync between instances goes over HTTP.

## Constraints

- No pnpm/npm/corepack on the host. No changes to `package.json`,
  `pnpm-lock.yaml`, `Dockerfile` or `node_modules`. Installs only happen inside
  a `docker build` of the existing Dockerfile (pnpm 9.14.4 comes from
  `packageManager` via corepack, `--frozen-lockfile`).
- Don't touch the three production hosts or the live NATS server. Test locally
  with NATS in Docker on this Mac.
- **No Loggly traffic:** the image contains `credentials.loggly.json`. The tests
  run with cwd `/test`, so the relative path is not found ("Loggly disabled").
  `test.js` refuses to run if Loggly credentials are loaded.
- Ask before committing. Ask before posting to #313.

## Approach

1. Build the image from the unchanged Dockerfile: `docker build -t scrobblecast:nats313 .`
2. Start each server with the gateway's own config
   (`im-qcic/infra/gateway/config/nats/nats-server.conf`, copied to
   `nats-compat/`: JetStream with a file store, websocket on 9222).
3. Run `nats-compat/test.js` inside the image, calling the real `lib/nats.js`
   and `lib/logcheck.js`, with `NATSURL` pointed at the local server.
4. Upgrade path: seed a store dir on the pinned server, then open that same
   store with 2.15.0 (this is what the real swap does).
5. Reconnect: keep a publisher running while the server swaps from pinned to 2.15.0.

Rerun from `js/`: `nats-compat/run.sh <image> [platform] [storeDir] [mode]` and
`nats-compat/reconnect.sh`, e.g.

```sh
nats-compat/run.sh nats:2.15.0
nats-compat/run.sh synadia/nats-server:nightly-20220224 linux/amd64
```

## Checklist

- [x] Read #313 and the ted1k result (passed unchanged)
- [x] Branch `nats-compat-313` created from `main` (`5e49121`)
- [x] Image built from unchanged Dockerfile. Tested with **Node v22.23.3**,
      Alpine 3.24.2, `nats@2.6.1` (the only nats in `node_modules/.pnpm`).
      `node:22-alpine` is unpinned, so this is the Node that was pulled on
      2026-09-28.
- [x] Harness written: `nats-compat/run.sh`, `nats-compat/test.js`
- [x] (a) pinned `nightly-20220224` (2.7.3-beta.3, amd64 emulated): **PASS 8/8**
- [x] (b) `nats:2.7.2`: **PASS 8/8**
- [x] (c) `nats:2.15.0`: **PASS 8/8**
- [x] Upgrade path: stream created and seeded on pinned, same store reopened on 2.15.0, replay: **PASS 5/5**
- [x] Reconnect across a server swap (pinned → 2.15.0, same name and store) with a running
      publisher (`nats-compat/reconnect.sh`): **PASS**. The client reconnected on its own
      about 4s after the old server was removed. 30 published, 26 in the stream (the 4
      published while no server was up were lost), and the replay on 2.15.0 returned all 26.
- [x] Commit plan and harness to branch, push (branch is not merged)
- [ ] #313: tick "scrobblecast ×3" with a one-line result, add a detail comment (ask first)

### Checks in `test.js` (each server)

1. connect (`maxReconnectAttempts: -1`, `verbose: true`, name `scrobblecast.scrape`)
2. `findOrCreateStream` on a fresh server: exercises the "stream not found" → create path (depends on the exact error message)
3. plain publishes: 6 digests (item/history) plus task, progress and sync.\*; a separate observer connection receives all 11
4. `findOrCreateStream` again: finds the existing stream, messages = 6
5. `replayMessages`: ordered consumer, ack none, start 2h back; gets all 6 and stops at `pending === 0`
6. `logcheck.getCheckpointRecordsNats('item')`: 3 records with host, digest and stamp
7. ephemeral consumers cleaned up (`consumer_count === 0`)
8. `scatter()` request/reply against a responder that replies with headers (like `discovery-client.js`); returns [] when there are no responders

The only server warning on all three was "Websocket not configured with TLS" (expected with this config).

## Result

Unchanged `nats@2.6.1` works against all three servers, across the store
upgrade, and through a live server swap, so no code change is needed and the smallest change is none. The
2022-03-01 revert to the nightly is unlikely to be caused by scrobblecast. The
gateway compose comment says "Official image is not working … to get
websockets", which points at the browser/websocket client instead.

## Not covered

- The deployed images were built at different times, so their Node version may
  differ from the tested v22.23.3. The NATS client (2.6.1) is the same.
- The store test used data created locally by the pinned server, not a copy of
  the real `scrobblecastDigest` store.
- Other #313 clients (natsql, the browser client over websocket, …) are separate items.
- Known harness leftovers: `run.sh` does not remove the `nats313` Docker network
  or its temp JetStream store dir (in `$TMPDIR`).
- `lib/nats.js` itself is unchanged. `discovery.js` loop timing and the cron
  schedule were not exercised; only the functions they call were.

## Side note

`im-qcic/docs/research/nats-js-client-current-practices.md` says scrobblecast
depends on `nats@2.29.3`. The lockfile and live connections say 2.6.1.
