# Scobblecast: implement the feed fetch in node.js

## Operation

Using a `Justfile` with targets:

```bash
> just
Available recipes:
    archive             # (just echo) Archive data/snapshots for /archive/mirror/scrobbleCast/
    build               # Build local Docker containers (--pull)
    check-ssh-remote    # Check SSH connectivity to all remote hosts
    check-status-remote # Check versions and digests across all remote hosts
    check               # alias for `check-status-remote`
    default             # List all available commands
    logs                # Show local Docker logs
    logs-remote         # Show recent logs from all remote hosts
    nats-board          # Show NATS board interface
    nats-logs           # Subscribe to  NATS messages
    nats-logs-pretty    # Subscribe to NATS messages with pretty printing
    nats-top            # Show NATS monitoring dashboard
    pin-docker-tags     # Check and test Docker base image tags and their SHA equivalents
    restore             # Restore database from snapshot
    scrub               # Scrub DB digests (Local)
    scrub-remote        # Scrub DB digests (Remote)
    snapshot            # Create database snapshot and upload to S3
    start               # Start local Docker containers
    stop                # Stop local Docker containers
    sync *ARGS          # Sync (remotely) data between hosts
```

## CI/CD

CI is performed by GitHub Actions, (as well as CircleCI for now).

There is a job for running tests, and if they pass an image (`ghcr.io/daneroo/scrobblecast/scrape:TAG`) is built and pushed to Github Container Registry.

It is also possible to run the Github actions with [act](https://github.com/nektos/act),
with 2 caveats

- `actions/setup-node@v2`'s `cache: 'npm'` statement must be commented out
- `elgohr/Publish-Docker-Github-Action@master`'s `no_push: ${{ env.ACT == 'true' }}` which disables push for local `act` run

## Nats

```bash
# jetstream clock test
nats stream info clockstream
nats stream purge clockstream
nats stream rm clockstream

nats pub test.clock --count=3600 --sleep 1s "{stamp:\"{{TimeStamp}}\"}"
nats pub test.clock.1 --count=3600 --sleep 1s "{origin:\"1\" stamp:\"{{TimeStamp}}\"}"
nats pub test.clock.2 --count=3600 --sleep 1s "{origin:\"2\" stamp:\"{{TimeStamp}}\"}"

export NATSURL=nats://nats.ts.imetrical.com:4222
export NATSURL=nats://localhost:4222
node jetstream-clock.js
```

## Test

Until npm run sescan/audit passes!

```bash
npm run unit

# - postgres
docker compose -f docker compose-services.yml up -d
DB_DIALECT=postgres npm run unit

# - or more verbose
DB_LOG=1 DB_DIALECT=postgres npm run unit
```

## TODO

- [ ] Move `dirac` to `scast-hilbert`
  - [x] copy credentials to `scast-hilbert`
  - [x] replace `dirac` with `scast-hilbert` in `lib/config.js`, `docker-compose.yml` and `scripts/common.sh`
  - [x] stop on dirac
  - [ ] rebuild on darwin, d1-px1
  - [ ] build on `scast-hilbert`

- [x] pnpm workspaces - just this directory for now
- diff command : sync from api, n hosts
- consolidate all top level commands
- add discovery through nats
  - add sync routes aas nats responders
- Declare nats schema (stamp,host) || removed ulid
  - im.scrobblecast.scrape.{task,progress,digest,sync,sync.trace,sync.error,logcheck?}
  - We might want to add `host|agentId` to subject taxonomy
- add `/api/items` route to mimic snapshot, similar to history
- Remove loggly, replace with: (write a nats.io transport?)
  - [pino](https://getpino.io/)
  - [pino-http](https://www.npmjs.com/package/pino-http)
  - [pino-pretty](https://github.com/pinojs/pino-pretty)
- Consider lightstream (perhaps from scrub container)
- Graceful Exit (shutdown) - for all top level scripts (dedup,sync,...)
- Move `/js` to `/packages/scrape`
- Logcheck - not necessary? will replace, from sync task/discovery - before and after?
- Define Release/Tag process for docker images
- Update sequelize v6 (and other deps)
  - [Update to winston@3](https://github.com/winstonjs/winston/blob/HEAD/UPGRADE-3.0.md)
- added (temporary) `./showNotes.js` script - to produce static documents for stork
  - added 2 methods to pocketAPIv2

- cleanup
  - Prune and move evernote to .
  - npm outdated
    - bluebird
    - lodash
    - mocha / (jest, replace istanbul?)
    - pg (just pass tests)
- log (and check) scrape calculations)
- <https://github.com/JoshuaWise/better-sqlite3>
- expose status for tasks (recently completed too)
- consolidate top level commands (dedup, sync, checkpoint, logcheck sync,scrape)
- refactor tasks: composable, adjust perUser, scrape, dedup vs checkpoint
- refactor store.file (sink|source/file)
- sync: discovery (ipfs / socket.io / socket.io-p2p?)
- sync: recent (day,..)
- store.load streaming
- data driven tests (dedup)
- npm run mirror: s3:// -> `/archive/mirror/scrobbleCast`

## Snapshot/Restore Process

The snapshot/restore process allows transferring a database state from a production host to a development machine via S3. 
The process preserves data integrity through digest verification at multiple levels: database checkpoints and directory content.
This is particularly useful for testing database operations in a safe environment with production data.

| On Production Host (darwin/d1-px1/scast-hilbert) | On Restore Dev Host (galois)                |
|--------------------------------------------------|---------------------------------------------|
| 1. `just stop` (optional)                        |                                             |
| 2. Record checkpoint digests                     |                                             |
| 3. `just snapshot` and record directory digest   |                                             |
| 4. `just start` (if stopped)                     |                                             |
|                                                  | 5. Remove local DB                          |
|                                                  | 6. `just restore`                           |
|                                                  | 7. Select current file from production host |
|                                                  | 8. Verify checkpoint digests                |
|                                                  | 9. `just dedup-digest` to restore histories |

### On Production Host

#### 1. `just stop` (optional)

For now we stop/start the scrape container,
because the snapshot takes longer than the scrape/dedup/digest cycle (barely).
This guarantees that our snapshot will be consistent

#### 2. Record checkpoint digests

This allows us to verify the integrity of the restored database.
e.g.

```txt
2024-12-06T04:32:33Z - info: checkpoint generation=2024-12-06T04:30:00Z, digest=4355..199d, scope=item
2024-12-06T04:32:34Z - info: checkpoint generation=2024-12-06T04:30:00Z, digest=ad4f..1e9f9, scope=history
`

####3. `just snapshot` and record directory digest

- accept Remove existing files in data/snapshots/current
- record the directory-digest if present

```txt
  ## Checking directory digests

snapshots                                      / -  416753684 bytes digest:f3f6b7ec..b2b50eea
  current                                      / -    1786043 bytes digest:ff197384..f995091a
    daniel                                     / -    1786043 bytes digest:c5422f20..888267c1
  monthly                                      / -  414967641 bytes digest:2c2e30f4..1f4bc990
    daniel                                     / -  414967641 bytes digest:fe5973e0..a5cfc3a9
✓ - Directory digests calculated
```

#### 4. `just start` (if stopped)

#### Back on the test restore machine (galois)

#### 5. Remove local DB

This is to ensure that the restore process is idempotent.

```bash
rm -rf data/sqlite/scrobblecast.sqlite
```

#### 6. `just restore`

- accept the download from S3

#### 7. Select current file from production host

```txt
Select which current file to keep for daniel:
✓ - Keeping snapshots/current/daniel/current-d1-px1.daniel.jsonl
✓ - Removed snapshots/current/daniel/current-dirac.daniel.jsonl
```

- accept proceed with database restore

#### 8. Verify checkpoint digests

```txt
2024-12-06T04:27:06.356Z - verbose: checkpoint digest=dbf49a...
```

```bash
> ./directory-digester-reference --verbose data/snapshots/ 2>/dev/null | grep '/ -'
snapshots                       / -  416731679 bytes digest:891d4690..7173ff31
  current                       / -    1764038 bytes digest:a95485c0..1eb59a24
    daniel                      / -    1764038 bytes digest:8813bda6..7bff4aab
  monthly                       / -  414967641 bytes digest:2c2e30f4..1f4bc990
    daniel                      / -  414967641 bytes digest:fe5973e0..a5cfc3a9
```

#### 9. `just dedup-digest` to restore histories

```bash
> just dedup-digest 
2024-12-06T04:48:16.385Z - info: digest digest=dbf49..9723, scope=item, elapsed=2.112
2024-12-06T04:48:16.813Z - info: digest digest=5bee..7785, scope=history, elapsed=0.428
```

## Sync paths

Scenario:

- restore from s3:

  - s3://scrobblecast/snapshots/ -> file:data/snapshots/
  - file:data/snapshots/ -> store
  - dedup

- scrape

  - scrape:(quick|shallow|deep) -> store
  - dedup

- sync(peer)

  - Discovery (hardcoded 2 list for now)
  - sync (peer)
  - dedup

- snapshot/sync to s3
  - dedup
  - store -> file:data/snapshots
  - file:data/snapshots/ -> s3://scrobblecast/snapshots/

## S3 Bucket and policy

**2016-08-18 Versioning was enabled on s3://scrobblecast/**
Objective: snapshots (monthly [/daily/hourly] ) will be saved to an s3 bucket.

This will be used as a seed for any new host, and replaces `data/rollup`.

For now, Using an on-disk cache, will allow us to use standard s3 sync tools.
However, we might want to consider `sinkFile.write( ,,{overwrite: true})` if we have versioning in the bucket!

- Bucket name: s3://scroblecast/ in region `US Standard`
- Bucket Policy: The policiy naming `scrobblecast-s3-rw` is attached to the bucket.

You gotta be kidding, separate statement for list, and put/get/delete

```json
{
  "Id": "Policy1469750948684",
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "Stmt1469750860759",
      "Action": ["s3:ListBucket"],
      "Effect": "Allow",
      "Resource": "arn:aws:s3:::scrobblecast",
      "Principal": {
        "AWS": ["arn:aws:iam::450450915582:user/scrobblecast-s3-rw"]
      }
    },
    {
      "Sid": "Stmt1469750944350",
      "Action": ["s3:DeleteObject", "s3:GetObject", "s3:PutObject"],
      "Effect": "Allow",
      "Resource": "arn:aws:s3:::scrobblecast/*",
      "Principal": {
        "AWS": ["arn:aws:iam::450450915582:user/scrobblecast-s3-rw"]
      }
    }
  ]
}
```

## Operations

### Local

- clean, restore, scrape, snapshot
- sqlite/postgres variants

```bash
# start fresh? cleanup first?
# e.g. rm -rf data/

# restore from s3 -> data/snapshots -> DB
docker compose run --rm scrape npm run restore
docker compose run --rm scrape node restore.js

# take a snapshot DB -> data/snapshots -> s3
# -optionally, to avoid pushing other hosts 'current'
#  rm -rf data/snapshots/current/
export HOSTNAME; docker compose run --rm scrape node snapshots.js
docker compose run --rm scrape npm run snapshot

# check monthly sums after restore/snapshots...
md5sum $(find data/snapshots -type f -not -name current\*)|cut -d \  -f 1|sort|md5sum

docker exec -it js-scrape-1 bash -c 'md5sum $(find data/snapshots -type f -not -name current\*)|cut -d \  -f 1|sort|md5sum'

docker compose run --rm scrape bash -c 'md5sum $(find data/snapshots -type f -not -name current\*)|cut -d \  -f 1|sort|md5sum'
```

## SQLite Snippets

```bash
sqlite3 scrobblecast.sqlite "VACUUM;"

# count by user/type
sqlite3 scrobblecast.sqlite "select __user, __type, count(*) from items group by __user, __type"

# count by user/type/uuid/stamp == 1 or 2
sqlite3 scrobblecast.sqlite "select __user, __type, uuid, __stamp, count(*) as Z from items group by __user, __type, uuid, __stamp having Z>1"

# count by user/type/uuid
sqlite3 scrobblecast.sqlite "select __user, __type, uuid, count(*) as Z from items group by __user, __type, uuid"
```

## Postgres notes

Start a container and connect to it

```bash
docker compose -f docker compose-services.yml up -d

docker compose exec postgres bash
  psql -U postgres scrobblecast
  psql -U postgres scrobblecast -c "select count(*) from items"

docker compose exec postgres psql -U postgres scrobblecast

scrobblecast=#
select __user,__type,count(*),count(distinct uuid) as dist,max(__stamp) from items group by __user,__type;
select __user,__type,count(distinct uuid),max(__stamp) from items group by __user,__type;
select distinct uuid, item->>'title' as title from items where __user='daniel' and __type='podcast'
select __user,__type,uuid, count(distinct uuid) dis,count(*) as all,min(__stamp),max(__stamp) from items group by __user,__type,uuid order by count(*) desc;
SELECT encode(digest(item::text, 'md5'), 'hex') as digest FROM items;
delete from items where encode(digest(item::text, 'sha256'), 'hex')='b24ef01e3f97f940798573e3bc845f9ffd9a2576a5adaee829fb77a398eaf863';
# -- aggregates on episodesForPodcast
# - episodes per podcast
select item->>'podcast_uuid' as puuid, count(distinct uuid) as neuuid from items where __user='daniel' and __type='episode' group by puuid order by neuuid,puuid
# === mysqladmin proc
select * from pg_stat_activity

# time selective queries for __stamp
time docker compose exec postgres psql -U postgres scrobblecast -c "select count(*) from items"
time docker compose exec postgres psql -U postgres scrobblecast -q -P pager=off -c "select encode(digest(item::text, 'md5'), 'hex') as digest FROM items"
time docker compose exec postgres psql -U postgres scrobblecast -q -P pager=off -c "select encode(digest(item::text, 'md5'), 'hex') as digest FROM items where __stamp>'2016-12-22 17:10'"
```

## Auth Notes

- Auth/Login:
  - GET /users/sign_in, to get cookies (XSRF-TOKEN)
  - POST form to /users/sign_in, with authenticity_token and credentials in form  
    Note: the POST returns a 302, which rejects the request-promise,  
    whereas a faled login returns the login page content again (200)  
    the 302 response also has a new XSRF-TOKEN cookie

## History

### dedupStamp

It was (improperly) possible to get duplicate items for same timestamp, due to flapping in the upstream APIs

Because of this we added another step in cron (dedupStamp), which still cannot be avoided because scraping is done in steps [02-podcasts,03-new_releases,04-in_progress], which are inserted independently.

When this code was deployed (2021-10-09) it caused a significant deduplication:

- `daniel |episode|656755 -> 347926`: 52% remain
- `stephane|episode|301949 -> 260610`: 86% remain
- `podcasts unchanged`

snapshot items before and after (only monthly):

- daniel: 651793 -> 348473 53% remain
- stephane: 307163 -> 266248 87% remain

A fresh snapshot was generated on 2021-10-16 which overwrites which was

- pushed to `s3://scrobblecast/snapshots`
- archived `/archive/mirror/scrobbleCast`

### Zeit/Now/Vercel

Before Now v2, we used to run docker containers on Zeit.

### Clock Drift (ancient history)

_dirac clock running fast in docker:_

```bash
date;docker exec -it js-scrape-1 date; date
docker run --rm --privileged alpine hwclock -s
date +%Y-%m-%dT%H:%M:%S%z ;docker exec -it js-scrape-1 date -Isec; date +%Y-%m-%dT%H:%M:%S%z

# while true; do sleep 600; done
AHEAD=$(expr $(docker run --rm alpine date +%s) - $(date +%s)); echo $(date +%Y-%m-%dT%H:%M:%S) Docker clock is ahead by ${AHEAD}
docker run --rm  alpine date +%s; date +%s

docker run --rm --net=host --pid=host --privileged -it justincormack/nsenter1 /bin/sh -c 'tail -2000 /var/log/ntpd.err.log'
```
