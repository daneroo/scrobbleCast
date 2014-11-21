# implement the feed fetch in node.js

* Auth
* Wrap JSON Rest API in module
* LevelDB Storage
* Try using promises
* Try using ES6

## Delta streams

We may receive (by polling) 4 kinds of files
- podcasts: the list : [podcast]
- new_releases/in_progress: {[episode]| episode.podcast_uuid}
- episodesForPodcast: {[episode]| implied episode.podcast_uuid}

In order to produce an event stream of changes to these entities, we must find an ordered way to traverse the dataset that is ammenable to incremental processing.

Represenation of current-state: accumulator:
  podcasts: {[podcasts]} -> 

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