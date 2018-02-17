
# Recent played history
Stores it's recent history in `./data/history-{$user}.json`.

fetch fresh history, run the recent played history analysis.
```
./get.sh
npm start

# move to static webapp assets.. (until  service)
scp -p data/history-* ../webapps/ionic-v3/src/assets/data/
scp -p data/history-* ../webapps/nextjs/data/
```

## TODO
- fetch from (local) service (orm)
- sore to orm (sqlite/postgres)
- integrate into scraper (on orm)
- graphql?

## compare-history
_deprecated: pre sync analysis code _
Compares historis between hosts' versions of `./data/${host}/history-${userr}-{type}.json` (deduped accumulated diffs)

As part of scrobblecast I need to do some fancy diff'ing on files on a few machines, _repeatedly_.
So this is to avoid constantly _rsync/ssh_'ing around
```
./get.sh
node index.js
```