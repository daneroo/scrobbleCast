# Scobblecast: implement the feed fetch in node.js

## Operation

Using a `Makefile`, with targets:

```bash
make build
make start
make logs
make snapshot
make archive # after snapshot
make restore
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
docker run -d --name nats -p 4222:4222 -p 6222:6222 -p 8222:8222 nats
npx natsboard --nats-mon-url http://demo.nats.io:8222
```

## Test

Until npm run sescan/audit passes!

```bash
npm run unit

# - postgres
docker-compose -f docker-compose-services.yml up -d
DB_DIALECT=postgres npm run unit

# - or more verbose
DB_LOG=1 DB_DIALECT=postgres npm run unit
```

## TODO

- add `/api/export` route to mimic snapshot
- Revert WAL - or make a config param - orm.js - Went back to no WAL for dedupStamp rollout
- Graceful Exit (shutdown) - for all top level scripts (dedup,sync,...)
- Move `/js` to `/packages/scrape`
- Make NATS Stream for `*.digest` events
- Logcheck - not necessary? will replace, from sync task/discovery - before and after?
- NATS `*.digest` event has no stamp@10minutes?
- Declare nats schema (id:ulid,host)
  - im.scrobblecast.scrape.{task,progress,digest,sync,sync.trace,sync.error,logcheck?}
  - We might want to add `host|agentId` to subject taxonomy
- Define Release/Tag process for docker images
- Remove loggly, replace with: (write a nats.io transport?)
  - [pino](https://getpino.io/)
  - [pino-http](https://www.npmjs.com/package/pino-http)
  - [pino-pretty](https://github.com/pinojs/pino-pretty)
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
    - pg (jsut pass tests)
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
docker-compose run --rm scrape npm run restore
docker-compose run --rm scrape node restore.js

# take a snapshot DB -> data/snapshots -> s3
# -optionally, to avoid pushing other hosts 'current'
#  rm -rf data/snapshots/current/
export HOSTNAME; docker-compose run --rm scrape node snapshots.js
docker-compose run --rm scrape npm run snapshot

# check monthly sums after restore/snapshots...
md5sum $(find data/snapshots -type f -not -name current\*)|cut -d \  -f 1|sort|md5sum

docker exec -it js_scrape_1 bash -c 'md5sum $(find data/snapshots -type f -not -name current\*)|cut -d \  -f 1|sort|md5sum'

docker-compose run --rm scrape bash -c 'md5sum $(find data/snapshots -type f -not -name current\*)|cut -d \  -f 1|sort|md5sum'
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
docker-compose -f docker-compose-services.yml up -d

docker-compose exec postgres bash
  psql -U postgres scrobblecast
  psql -U postgres scrobblecast -c "select count(*) from items"

docker-compose exec postgres psql -U postgres scrobblecast

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
time docker-compose exec postgres psql -U postgres scrobblecast -c "select count(*) from items"
time docker-compose exec postgres psql -U postgres scrobblecast -q -P pager=off -c "select encode(digest(item::text, 'md5'), 'hex') as digest FROM items"
time docker-compose exec postgres psql -U postgres scrobblecast -q -P pager=off -c "select encode(digest(item::text, 'md5'), 'hex') as digest FROM items where __stamp>'2016-12-22 17:10'"
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
date;docker exec -it js_scrape_1 date; date
docker run --rm --privileged alpine hwclock -s
date +%Y-%m-%dT%H:%M:%S%z ;docker exec -it js_scrape_1 date -Isec; date +%Y-%m-%dT%H:%M:%S%z

# while true; do sleep 600; done
AHEAD=$(expr $(docker run --rm alpine date +%s) - $(date +%s)); echo $(date +%Y-%m-%dT%H:%M:%S) Docker clock is ahead by ${AHEAD}
docker run --rm  alpine date +%s; date +%s

docker run --rm --net=host --pid=host --privileged -it justincormack/nsenter1 /bin/sh -c 'tail -2000 /var/log/ntpd.err.log'
```
