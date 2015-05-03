# implement the feed fetch in node.js

* Docker
* Auth
* Wrap JSON Rest API in module
* LevelDB Storage
* Try using promises
* Try using ES6

## Docker

  docker build -t daneroo/pocketscrape .
  docker run -it --rm -v $(pwd)/credentials.json:/usr/src/app/credentials.json -v $(pwd)/data:/usr/src/app/data daneroo/pocketscrape node cron.js
  docker exec -it <container id> bash

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
