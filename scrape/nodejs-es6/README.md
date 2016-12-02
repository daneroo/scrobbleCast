# implement the feed fetch in node.js

## Sync paths

Questions:
- How has legacy diverged (detail)
- How has peer diverged
- Update to/from legacy

Scripts:

- rollup: file:'' -> file:rollup (deprecated)

- restore.js: file:rollup+'' -> pg (transition deprecated)
- snapshot.js: pg -> file:snapshot 
  - currently file:rollup+'' -> file:snapshots
- s3-cli file:data/snapshots/ <->  s3://scrobblecast/snapshots/
- sync.js: compare file:roolup+'', pg: (no write)

Scenario:

- init/sync from s3: 
  - s3://scrobblecast/snapshots/ -> file:data/snapshots/
  - file:data/snapshots/ -> pg
  - dedup

- scrape
  - scrape:(quick|shallow|deep) -> pg
  - dedup

- sync(peer) MVP
  - pg:peer -> pg, or pg:peer ->file:data/snapshots -> pg
  - dedup

- sync(legacy peer)
  - rsync -> file:data
  - file:data -> pg
  - dedup

- snapshot/sync to s3
  - dedup
  - pg -> file:data/snapshots
  - file:data/snapshots/ ->  s3://scrobblecast/snapshots/

## TODO

- snapshots: clean up assertions (move them to store (like file.load?))
- snapshots to dir, then [s3-cli sync](https://github.com/andrewrk/node-s3-cli)
- remove `s3-cli`, replace by `s3` get creds from json instead of s3cfg.ini (.gitgnore)
- config
- [streaming with pg-promise](https://github.com/vitaly-t/pg-promise/wiki/Learn-by-Example#streaming)
- [multiple return](http://www.2ality.com/2014/06/es6-multiple-return-values.html) (insert->ok,status)
- deprecate srcFile
- upgrade bluebird
- replace npm scripts: `snapshots` and `restore`
- sync: load all from file and database, compare
- Fix babel'd start (cwd, and relative paths) Move scripts to (sub)folder to fix relative paths.
- scrape/nodejs-es6/lib/jsonl.js:57 restore log.info for jsonl.write
- confirm docker-compose logging (max-size/max-file) and restart
- restore: buffer writes.
- restore: push to remote database (from dirac,darwin -> dockerX)
- Seperate dedup from consensus-signature
  - dedup per uuid
  - consensus based on digest of non deduped entries. (order by digest|date,..)
- restore-pg switches from default `saveButVerifyIfDuplicate` to `checkThenSaveItem` on first fail...

+ snashots now load from db
+ eslint cleanup
+ remove `.jsbeautifyrc, .jshitrc, .jscsrc`
+ Deprecate pgu.insert,pgu.query in favor of pgu.db.any|none
+ [speed pg-promise](http://vitaly-t.github.io/pg-promise/helpers.html#.insert)
+ [speed pg-promise see also](https://github.com/vitaly-t/pg-promise/wiki/Performance-Boost)
+ Refactor pg-helpers.insert usage (getFields)
+ dedup: just delete from database;
+ babel into gulp
+ babel/eslint for async/await
+ docker-compose
+ Move rollup'd files to archive (part of rollup)
+ pg.saveAll - concurrency (use bluebird.each)
+ pgcrypto in pg.init
+ digest in pg.items, with index on expression: no speedup

## TESTING

stephane-episode.json, md5=a62b7af3614923648c949766ede13b58, n=18090, MB=22.61
stephane-podcast.json, md5=7cb08a24fe420290581621be034f4ace, n=131, MB=0.23
daniel-episode.json,   md5=046ae7ff5687bea1e3cca4a3723171bc, n=24449, MB=32.21
daniel-podcast.json,   md5=e55c7a85be45c0e74f27b09f3a803433, n=93, MB=0.18


    stephane-episode.json, md5=22567cb74b15ef1c621407862c242637, n=17936, MB=22.40
    stephane-podcast.json, md5=19a8e6733c891b7fa4b21e494031667e, n=131, MB=0.23
    daniel-episode.json,   md5=d7069cd5fedd450085c60d935aa1af3e, n=24167, MB=31.77
    daniel-podcast.json,   md5=7f87add9a903ca46d837092fde11d03b, n=92, MB=0.18

      __user  | __type  | dist  | count |          max           
    ----------+---------+-------+-------+------------------------
    daniel   | episode | 24167 | 90375 | 2016-07-29 20:00:00+00
    daniel   | podcast |    92 |   611 | 2016-07-29 04:00:00+00
    stephane | episode | 17936 | 41240 | 2016-07-29 20:00:00+00
    stephane | podcast |   131 |  4257 | 2016-07-29 16:00:00+00

## S3 Bucket and policy

**2016-08-18 Versioning was enabled on s3://scrobblecast/**


Objective: snapshots (monthly [/daily/hourly] ) will be saved to an s3 bucket.

This will be used as a seed for any new host, and replaces `data/rollup`.

For now, Using an on-disk cache, will allow us to use standard s3 sync tools.
However, we might want to consider `sinkFile.write( ,,{overwrite: true})` if we have versioning in the bucket!

    ./node_modules/.bin/s3-cli --config s3cfg.ini ls s3://scrobblecast/

- Bucket name: s3://scroblecast/ in region `US Standard`
- Bucket Policy: The policiy naming `scrobblecast-s3-rw` is attached to the bucket.

You gotta be kidding, separate statement for list, and put/get/delete


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
Fix the paths to apply proper lifecycle rules:

- from: `rollup/byUserStamp/daniel/2016-06-01T00:00:00Z//monthly-2016-06-01T00:00:00Z.jsonl`
- to  `snapshots/monthly/daniel/monthly-daniel-2016-06-01T00:00:00Z.jsonl`
- and `snapshots/daily/daniel/daily-daniel-2016-06-01T00:00:00Z.jsonl`
- and `snapshots/hourly/daniel/hourly-daniel-2016-06-01T00:00:00Z.jsonl`

- We will store (rollup) on s3
- We will restore (rollup) from s3
- We will [have expiry policy on daily/hourly](https://aws.amazon.com/blogs/aws/amazon-s3-object-expiration/)

## Moving away from files

- Confirming all old files are accounted for
- Archiving : move all file which have been rollup'd into data/archive


    mkdir -p data/archive/byUserStamp/daniel
    mkdir -p data/archive/byUserStamp/stephane
    cd data
    # find -exec mv: gives lots of 'No such file or directory' errors: it's OK
    find byUserStamp -type d -name 201[45]-\* -exec mv {} ./archive/{} \;
    # move up to june(2016-08) ...
    find byUserStamp -type d -name 2016-0[1-9]\* -exec echo mv {} ./archive/{} \;
    find byUserStamp -type d -name 2016-1[0-1]\* -exec echo mv {} ./archive/{} \;

### Temp: seed/restore to pg from files
Given a fresh db, restore from rollups.. synch with dirac

    docker-compose up -d postgres
    time node restore.js  # with basepaths = ['rollup', '']
    docker-compose up -d scrape

## Docker Cloud
  inject credentials somehow:
  remove .dockerignore for 2 credential json files
  remove user daniel clause causing perm probs.
  How to set HOSTNAME???

  inject data (before synch is possible)

Build the image locally

  docker-compose build
  docker tag nodejses6_scrape:latest daneroo/scrobblecast:withcreds
  # Just regenerate if you loose these keys (password is api key)
  docker login -u daneroo -p f787d9cc-b151-48a1-84aa-3b39ac0bb972 -e daniel.lauzon@gmail.com
  docker push daneroo/scrobblecast:withcreds



## Docker
This was for goedel, moving to dicker-cloud.

    docker-compose build
    docker-compose up -d

## PostgreSQL
[Quick intro to PostgreSQL JSON.](http://clarkdave.net/2013/06/what-can-you-do-with-postgresql-and-json/)

### Using node.js pg-promise

+ [speed pg-promise](http://vitaly-t.github.io/pg-promise/helpers.html#.insert)
+ [speed pg-promise see also](https://github.com/vitaly-t/pg-promise/wiki/Performance-Boost)

### Using pg with docker-compose

Start a container and connect to it

    docker-compose up -d postgres

    docker-compose exec postgres bash
      psql -U postgres scrobblecast
      psql -U postgres scrobblecast -c "select count(*) from items"

    docker-compose exec postgres psql -U postgres scrobblecast

    scrobblecast=#
    select __user,__type,count(distinct uuid),max(__stamp) from items group by __user,__type;
    select distinct uuid, item->>'title' as title from items where __user='daniel' and __type='podcast'
    select __user,__type,uuid, count(distinct uuid) dis,count(*) as all,min(__stamp),max(__stamp) from items group by __user,__type,uuid order by count(*) desc;
    SELECT encode(digest(item::text, 'md5'), 'hex') as digest FROM items;
    # === mysqladmin proc
    select * from pg_stat_activity

### Using pg crypto
The extension for `pgcrypto`, although available, must be loaded (once)

    create extension pgcrypto;
    # possible error if already loaded: ERROR:  extension "pgcrypto" already exists
    # example use of digest; notice cast of item(::json) to ::text
    SELECT encode(digest(item::text, 'sha256'), 'hex') from items limit 100;

## CouchDB for persistence
Note: try CouchDB 2.0 
Don't put the data volume in `./data` because we often rsync!

  docker run -d -p 5984:5984 -e COUCHDB_PASS="supersecret" -v $(pwd)/couchdb:/var/lib/couchdb --name couchdb tutum/couchdb

Then open Futon 
 on [docker](http://admin:supersecret@docker:5984/_utils/)
 or [cantor](http://admin:supersecret@cantor:5984/_utils/)

To compact database:

  curl -H "Content-Type: application/json" -X POST http://admin:supersecret@docker:5984/scrobblecast/_compact

### Docker file permissions
*note* we now set uid/gid to daniel.daniel (1000), to match cantor numeric ids

  rsync --delete -avz --progress daniel@dirac.imetrical.com:Code/iMetrical/scrobbleCast/scrape/nodejs-es6/data/ data/
  # check
  find data -not -user daniel -ls
  # fix if necessary
  sudo chown -R daniel.daniel data/

#### Deprecated
On cantor, the container creates it's files as root, so when I sync, ignore owner

  # maybe add --delete
  sudo rsync -av --no-owner --progress daniel@dirac.imetrical.com:Code/iMetrical/scrobbleCast/scrape/nodejs-es6/data/ data/
  # check
  find data -not -user root -ls
  # fix if necessary
  sudo chown -R root:root data/

## Universal streams

Having toyed with both control flow pattterns and storage models, we have arrived at a flexible represeantion which may be the output of a scrape operation, amenable to storage (file/leveldb/pouch), as well as processing (aggregation). We have started down the path of a _promise based_ control structure, but we may yet investigate [pull-streams](https://github.com/dominictarr/pull-stream).

* {key:<descriptor fields>, values:<content of scrape>}
* aggreated in files/stream as a single array or json lines.

## Delta streams

We may receive (by polling) 4 kinds of files
- podcasts: the list : [podcast]
- new_releases/in_progress: {[episode]| episode.podcast_uuid}
- episodesForPodcast: {[episode]| implied episode.podcast_uuid}

In order to produce an event stream of changes to these entities, we must find an ordered way to traverse the dataset that is ammenable to incremental processing.

Represenation of current-state: accumulator:
  podcasts: {[podcasts]} -> 

### Operations

Running `delta.js`; also prune empty dirs after

    time ./dedup.sh

### New high level flow: psudo-code, 
Rewrite (spec) the delta process, to account for different uses, from file or cron (http get callback), to file(s), leveldb,couch and later synched up to (firebase/metor/couch).

*Note to self: looks like this is turning into [stream programming](http://ejohn.org/blog/node-js-stream-playground/)*. Also check:

* [Tim Caswell's post](http://howtonode.org/coding-challenges-with-streams)
* [Seth Fitzsimmons' Gist](https://gist.github.com/mojodna/8175805)
* [Thorsten Lorenz blog post ](http://thlorenz.com/blog/event-stream)
* [event-streams (by Dominic Tarr)](https://github.com/dominictarr/event-stream)
* [replaced by his pull stream](https://github.com/dominictarr/pull-stream)

New flow:

* find('byDate/**/*.json')
    * should be able to fragment (partition) the triggers (walking subrtrees/filters), partial scrape tasks, or leveldb index traversal.
    * abstraction the entities are **generated** from file walking, db traversal or a scrape
    * the output (event stream) has keys, and values (per entity)
    * ensureSorted: abstraction guarantee the possibility of comparing to (previous) item
* sink: output to files (new keys), leveldb (same keyes)
    * buffered batch write to level
* transform: map/reduce aggregation, and back to 
    * delta (changeset) transorm
    * summaries, and indexes
    * backed by files or other tables (levels)


Normalization of values (histo.js):
* `is_deleted, starred, (is_video ?)` number<->boolean
* `duration, played_up_to, playing_status` null <-> number

We have two choices, cast to appropriate type, or omit the offending value
-Sometimes the last observed value is null, which means we should probably ignore these

Conclusion
* `is_deleted, starred, (is_video ?)` number<->boolean: cast to boolean
* `duration, played_up_to, playing_status` null <-> number: remove

We will do this in delta.compare -> normalize


## TODO - Moving to Evernote

* Delta Events
  * prefix files: with 01-podcasts.json,02-podcasts/
  * byUser/byPocast/byStamp
  * storage (history)
  * refcator (cleanup)
  * include quick/shallow/deep
* [gulp](https://github.com/youngmountain/generator-node-gulp)
* test
* instead of logging, broadcast/pubsub messages: (can sync to Firebase)
* compose 
  * all pages for a podcast:  Done, needs refactor
  * all podcasts (quick/deep, on fetchAll)
* docker with creds in `ENV`

Done 

* rate limiting (as in rate.js): Done
* Store (file done)

## Notes

* Auth/Login: 
  * GET /users/sign_in, to get cookies (XSRF-TOKEN)
  * POST form to /users/sign_in, with authenticity_token and credentials in form  
    Note: the POST returns a 302, which rejects the request-promise,  
    whereas a faled login returns the login page content again (200)  
    the 302 response also has a new XSRF-TOKEN cookie  
* Timing concurrency
  fetchall:  20s (concurrency:{page:5,podcasts:10},rate: 500/s)
  fetchall: 715s (concurrency:{page:1,podcasts:1},rate: 1/s)
* Cron: `cron` npm module, just worked.
* LevelDB, many addons to try (level-path,level-path-index)
  * Install with `npm install level`, but could use `npm install levelup leveldown@0.10`
  * LevelUp will be 1.0 soon, check then


## References

* [custom headers])https://github.com/request/request#custom-http-headers)
* [Rate limiting](https://github.com/jhurliman/node-rate-limiter)
