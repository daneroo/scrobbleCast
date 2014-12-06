#!/usr/bin/env bash

date -u +'%Y-%m-%dT%H:%M:%SZ Starting Dedup'
time node delta.js

date -u +'%Y-%m-%dT%H:%M:%SZ Dedup - delta done'

date -u +'%Y-%m-%dT%H:%M:%SZ Prune empty dirs'
echo '-Empty dir count:' `find data/by* -type d -empty |wc -l`
# Must run twice...
find data/by* -type d -empty -exec rmdir {} \;
find data/by* -type d -empty -exec rmdir {} \;
echo '+Empty dir count:' `find data/by* -type d -empty |wc -l`
date -u +'%Y-%m-%dT%H:%M:%SZ Done'
