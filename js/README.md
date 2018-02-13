# implement the feed fetch in node.js

_ dirac running fast in docker: _
```
date;docker exec -it js_scrape_1 date; date
docker run --rm --privileged alpine hwclock -s
date;docker exec -it js_scrape_1 date; date
```

## Test 
Until npm run sescan passes!
```
npm run unit

# - postgres
docker-compose -f docker-compose-services.yml up -d
DB_DIALECT=postgres npm run unit

# - or more verbose
DB_LOG=1 DB_DIALECT=postgres npm run unit
```


## TODO

- integrate [debug](https://www.npmjs.com/package/debug) into logging
- try pull-streams
- cleanup
  - Prune and move evernote to .
  - npm outdated
    - bluebird
    - lodash
- refactor tasks: composable, adjust perUser, dedup vs checkpoint
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
```
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

```
# start fresh? cleanup first?
rm -rf data/
docker volume rm js_scrbl_pgdata

# build and run
export HOSTNAME
docker-compose build
docker-compose up -d
docker-compose logs -f scrape

# restore from s3 -> data/snapshots -> DB
docker-compose run --rm scrape npm run restore
docker-compose run --rm scrape node restore.js

# take a snapshot pg -> data/snapshots -> s3
# -optionally, to avoid pushing other hosts 'current'
#  rm -rf data/snapshots/current/
export HOSTNAME; docker-compose run --rm scrape node snapshots.js
docker-compose run --rm -it scrape npm run snapshot

# to run a single sync run
docker-compose run --rm scrape node sync.js http://euler.imetrical.com:8000/api
docker-compose run --rm scrape node sync.js http://dirac.imetrical.com:8000/api
docker-compose run --rm scrape node sync.js http://darwin.imetrical.com:8000/api
docker-compose run --rm scrape node sync.js http://newton.imetrical.com:8000/api
docker-compose run --rm scrape node sync.js http://192.168.3.131:8000/api
docker-compose run --rm scrape node sync.js http://192.168.5.144:8000/api

# dedup as needed
export HOSTNAME; docker-compose run --rm scrape node dedup.js

# delete for extraordinary reconcile
docker-compose exec postgres psql -U postgres scrobblecast
scrobblecast=# delete from items where encode(digest(item::text, 'sha256'), 'hex')='3fef8c3a1f5808d2938e06fa9e5cb419fe6d7fe9d10e56f59ddb87a5245d7211';

# check monthly sums after restore/snapshots...
```
md5sum $(find data/snapshots -type f -not -name current\*)|cut -d \  -f 1|sort|md5sum

docker exec -it js_scrape_1 bash -c 'md5sum $(find data/snapshots -type f -not -name current\*)|cut -d \  -f 1|sort|md5sum'

docker-compose run --rm scrape bash -c 'md5sum $(find data/snapshots -type f -not -name current\*)|cut -d \  -f 1|sort|md5sum'
```

## Deployment: Zeit Now / Docker Cloud / k8s
inject credentials somehow:
```
remove .dockerignore for 2 credential json files
remove user daniel clause causing perm probs.
How to set HOSTNAME???

inject data (before synch is possible)
```

Build the image locally
```
  docker-compose build
  docker tag nodejses6_scrape:latest daneroo/scrobblecast:withcreds
  # Just regenerate if you loose these keys (password is api key)
  docker login -u daneroo -p f787d9cc-b151-48a1-84aa-3b39ac0bb972 -e daniel.lauzon@gmail.com
  docker push daneroo/scrobblecast:withcreds
```

## Postgres notes

Start a container and connect to it

```
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
