# Scobblecast: implement the feed fetch in node.js

## Operation

Using a `Makefile`, with targets:

```bash
make build
make start
make logs
make snapshot
make restore
```

## Nats

```bash
docker run -d --name nats -p 4222:4222 -p 6222:6222 -p 8222:8222 nats
npx natsboard --nats-mon-url http://demo.nats.io:8222
```

## Test

Until npm run sescan passes!

```bash
npm run unit

# - postgres
docker-compose -f docker-compose-services.yml up -d
DB_DIALECT=postgres npm run unit

# - or more verbose
DB_LOG=1 DB_DIALECT=postgres npm run unit
```

## TODO

- Adjust qcic.site/nats section to see new events - generic - no schema
- Make digest a stream(s)
- Logcheck - not necessary? will replace, from sync task/discovery - before and after?
- digest has no stamp@10minutes?
- Declare nats schema (id:ulid,host)
  - im.scrobblecast.scrape.{task,progress,digest,sync,sync.trace,sync.error,logcheck?}
  - We might want to add `host|agentId` to subject taxonomy
- Push image to ghcr.io
- [Build w/Github Actions](https://betterprogramming.pub/continuously-build-node-js-docker-images-using-github-actions-1e58df9c9faa)
- Revert WAL - or make a config param - orm.js
- Remove loggly, replace with:
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
  - file:data/snapshots/ ->  s3://scrobblecast/snapshots/

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
      "Action": [
        "s3:ListBucket"
      ],
      "Effect": "Allow",
      "Resource": "arn:aws:s3:::scrobblecast",
      "Principal": {
        "AWS": [
          "arn:aws:iam::450450915582:user/scrobblecast-s3-rw"
        ]
      }
    },
    {
      "Sid": "Stmt1469750944350",
      "Action": [
        "s3:DeleteObject",
        "s3:GetObject",
        "s3:PutObject"
      ],
      "Effect": "Allow",
      "Resource": "arn:aws:s3:::scrobblecast/*",
      "Principal": {
        "AWS": [
          "arn:aws:iam::450450915582:user/scrobblecast-s3-rw"
        ]
      }
    }
  ]
}
```

## Operations

### Local

- clean, restore, scrape, snapshot
- sqlite/postgres variant

```bash
# start fresh? cleanup first?
rm -rf data/
docker volume rm js_scrbl_pgdata

# build and run
export HOSTNAME
docker-compose build --pull
export HOSTNAME; docker-compose up -d
docker-compose logs -f scrape

# clear screen:
/usr/bin/osascript -e 'tell application "System Events" to tell process "Terminal" to keystroke "k" using command down'


# restore from s3 -> data/snapshots -> DB
docker-compose run --rm scrape npm run restore
docker-compose run --rm scrape node restore.js

# take a snapshot DB -> data/snapshots -> s3
# -optionally, to avoid pushing other hosts 'current'
#  rm -rf data/snapshots/current/
export HOSTNAME; docker-compose run --rm scrape node snapshots.js
docker-compose run --rm scrape npm run snapshot

# curl digests:
for h in darwin dirac newton; do echo $h `curl -s http://$h.imetrical.com:8000/api/digests|shasum -a 256`; done
# curl version:
for h in darwin dirac newton; do echo $h `curl -s http://$h.imetrical.com:8000/api/version`; done
# curl status:
for h in darwin dirac newton; do echo $h `curl -s http://$h.imetrical.com:8000/api/status`; done

# to run a single sync run
docker-compose run --rm scrape node sync.js http://dirac.imetrical.com:8000/api
docker-compose run --rm scrape node sync.js http://darwin.imetrical.com:8000/api
docker-compose run --rm scrape node sync.js http://newton.imetrical.com:8000/api

# dedup as needed - also upserts all history
export HOSTNAME; docker-compose run --rm scrape node dedup.js

# delete for extraordinary reconcile
docker-compose exec postgres psql -U postgres scrobblecast
scrobblecast=# delete from items where encode(digest(item::text, 'sha256'), 'hex')='3fef8c3a1f5808d2938e06fa9e5cb419fe6d7fe9d10e56f59ddb87a5245d7211';

# check monthly sums after restore/snapshots...
md5sum $(find data/snapshots -type f -not -name current\*)|cut -d \  -f 1|sort|md5sum

docker exec -it js_scrape_1 bash -c 'md5sum $(find data/snapshots -type f -not -name current\*)|cut -d \  -f 1|sort|md5sum'

docker-compose run --rm scrape bash -c 'md5sum $(find data/snapshots -type f -not -name current\*)|cut -d \  -f 1|sort|md5sum'
```

## Deployment: Zeit Now / Docker Cloud / k8s

inject credentials somehow:

```bash
remove .dockerignore for 2 credential json files
remove user daniel clause causing perm probs.
How to set HOSTNAME???

inject data (before synch is possible)
```

Build the image locally

```bash
  docker-compose build
  docker tag nodejses6_scrape:latest daneroo/scrobblecast:withcreds
  # Just regenerate if you loose these keys (password is api key)
  docker login -u daneroo -p f787d9cc-b151-48a1-84aa-3b39ac0bb972 -e daniel.lauzon@gmail.com
  docker push daneroo/scrobblecast:withcreds
```

## Postgres notes

Start a container and connect to it

```bash
docker-compose up -d postgres

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

## Clock Drift (ancient history)

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
