#!/usr/bin/env bash

date -u +'%Y-%m-%dT%H:%M:%SZ Starting Dedup'
time node delta.js

date -u +'%Y-%m-%dT%H:%M:%SZ Dedup - delta done'

date -u +'%Y-%m-%dT%H:%M:%SZ Prune empty dirs'
echo '-Empty dir count:' `find data/by* -type d -empty |wc -l`

# dedup function in delta.js now removes (try catch) the directory
# Must run twice...
#find data/by* -type d -empty -exec rmdir {} \; 2>/dev/null
#find data/by* -type d -empty -exec rmdir {} \; 2>/dev/null
#echo '+Empty dir count:' `find data/by* -type d -empty |wc -l`

date -u +'%Y-%m-%dT%H:%M:%SZ Done'
