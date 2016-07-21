# implement the feed fetch in node.js

## TODO

- scrape/nodejs-es6/lib/jsonl.js:57 restore log.info for jsonl.write
- Use babel-node for async/await
- confirm docker-compose logging (max-size/max-file) and restart
- dedup: mark status, delete (window, or write to file);
- config
- restore-pg: buffer writes.
- restore-pg: push to remote database (from dirac,darwin -> dockerX)
- Seperate dedup from consensus-signature
  - dedup per uuid
  - consensus based on digest of non deduped entries. (order by digest|date,..)
- restore-pg switches from default `saveButVerifyIfDuplicate` to `checkThenSaveItem` on first fail...

+ babel/eslint for async/await
+ docker-compose
+ Move rollup'd files to archive (part of rollup)
+ pg.saveAll - concurrency (use blubird.each)
+ pgcrypto in pg.init
+ digest in pg.items, with index on expression: no speedup

## Moving away from files

- Confirming all old files are accounted for
- Archiving : move all file which have been rollup'd into data/archive


    mkdir -p data/archive/byUserStamp/daniel
    mkdir -p data/archive/byUserStamp/stephane
    cd data
    # find -exec mv: gives lots of 'No such file or directory' errors: it's OK
    find byUserStamp -type d -name 201[45]-\* -exec mv {} ./archive/{} \;
    # move up to june(2016-06) ...
    find byUserStamp -type d -name 2016-0[1-6]\* -exec echo mv {} ./archive/{} \;

## Docker

  docker-compose build
  docker-compose up -d

### PostgreSQL
[Quick intro to PostgreSQL JSON.](http://clarkdave.net/2013/06/what-can-you-do-with-postgresql-and-json/)

Start a container and connect to it

    docker run -it --rm -p 5432:5432 -e POSTGRES_DB=scrobblecast --name postgres postgres

    # Database creation is now done with $POSTGRES_DB
    # docker exec -it postgres createdb -U postgres scrobblecast

    docker exec -it postgres psql -U postgres scrobblecast
    docker exec -it postgres bash
      psql -U postgres scrobblecast -c "select count(distinct uuid) from items"

    scrobblecast=#
    select __user,__type,count(distinct uuid),max(__stamp) from items group by __user,__type;
    select distinct uuid, item->>'title' as title from items where __user='daniel' and __type='podcast'
    select __user,__type,uuid, count(distinct uuid) dis,count(*) as all,min(__stamp),max(__stamp) from items group by __user,__type,uuid order by count(*) desc;
    # === mysqladmin proc
    select * from pg_stat_activity

#### Using pg crypto
The extension for `pgcrypto`, although available, must be loaded (once)

    create extension pgcrypto;
    # possible error if already loaded: ERROR:  extension "pgcrypto" already exists
    # example use of digest; notice cast of item(::json) to ::text
    SELECT encode(digest(item::text, 'sha256'), 'hex') from items limit 100;

### CouchDB for persistence
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
