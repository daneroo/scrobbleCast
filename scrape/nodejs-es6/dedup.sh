#!/usr/bin/env bash

date -u +'%Y-%m-%dT%H:%M:%SZ Dedup - start'
time node dedup.js

date -u +'%Y-%m-%dT%H:%M:%SZ Dedup - done'

date -u +'%Y-%m-%dT%H:%M:%SZ Prune empty dirs'
echo '-Empty dir count:' `find data/by* -type d -empty |wc -l`

# dedup function in delta.js now removes (try catch) the directory
# Must run twice...
#find data/by* -type d -empty -exec rmdir {} \; 2>/dev/null
#find data/by* -type d -empty -exec rmdir {} \; 2>/dev/null
#echo '+Empty dir count:' `find data/by* -type d -empty |wc -l`

# Here is where we could prune deduped files
#find data/dedup -mtime +2 -type f -exec rm {} \;

date -u +'%Y-%m-%dT%H:%M:%SZ Done'
