#!/usr/bin/env bash

# This script restores the history table by leveraging dedup's ability to regenerate it.
# 
# The history table is essentially a cache of item changes, where:
# 1. Items table is the source of truth
# 2. History table contains the accumulated changes per uuid
# 3. History entries are also uniquely identified by their digest (content-addressed)
# 4. dedup.js can fully regenerate histories by streaming all items (in dedupOrder)
#
# This is why we could have:
#   a) DROP the entire histories table
#   b) Run dedup to regenerate it from items
#   c) Get back exactly the same histories (enforced by content addressing)
# For the snapshots we are working with, we expect
# checkpoint digest=dd46da21737a5b00525199afc9353a420b1f6181c12c235a23c9514a1328596b, scope=item
# checkpoint digest=c075cd00f6853b2ce8e672fd547c81ea29045d26a5c4a0d6ce0021b8fb8918d9, scope=history
# Source common functions and variables
source "$(dirname "$0")/common.sh"

cat << EOF | $GUM_FMT_CMD
## Warning

This script is destructive, it will remove or overwrite:
- data/sqlite/scrobblecast.sqlite (database)
- data/snapshots/ (.jsonl)
EOF

if ! gum confirm "Do you want to proceed?"; then
    format "Operation cancelled"
    exit 1
fi

# TODO(daneroo): find stray histories with a join!!
# override hosts
# HOSTS=("dirac")

format "## Validate Regenerating history (digests)"

for host in "${HOSTS[@]}"; do
    format "### Host: ${host}"
    
    format "#### Restore Database"
    echo "- Copying backup"| $GUM_FMT_CMD
    scp -p data/sqlite/scrobblecast-${host}-preDropSteph.sqlite data/sqlite/scrobblecast.sqlite;
    echo "- Confirm integrity host:${host} sha256sum:$(sha256sum data/sqlite/scrobblecast.sqlite)"| $GUM_FMT_CMD
    
    echo "- Digest Users before"| $GUM_FMT_CMD
    node digestUsers.js 2>&1|grep 'digest='

    format "#### Counts before DROP and dedup"
    echo "- Items - counts by user and type:"| $GUM_FMT_CMD
    sqlite3 --column --header data/sqlite/scrobblecast.sqlite "SELECT __user, __type, COUNT(*) as count FROM items GROUP BY __user, __type ORDER BY __user, __type;"
    
    echo "- Histories - counts by user and type:"| $GUM_FMT_CMD
    sqlite3 --column --header data/sqlite/scrobblecast.sqlite "SELECT __user, __type, COUNT(*) as count FROM histories GROUP BY __user, __type ORDER BY __user, __type;"
    
    echo "- Checking for orphaned histories..."| $GUM_FMT_CMD
    sqlite3 --column --header data/sqlite/scrobblecast.sqlite "
    SELECT h.__user, h.__type, h.uuid
    FROM histories h
    LEFT JOIN items i ON 
        h.__user = i.__user AND 
        h.__type = i.__type AND 
        h.uuid = i.uuid
    WHERE i.__user IS NULL
    ORDER BY h.__user, h.__type, h.uuid;"

    # format "#### Performing DELETE all from histories"
    # echo "- Deleting all from histories..."| $GUM_FMT_CMD
    # sqlite3 data/sqlite/scrobblecast.sqlite "DELETE FROM histories;"

    format "#### Performing selective DELETE from histories"
    echo "- Deleting orphaned histories..."| $GUM_FMT_CMD
    sqlite3 data/sqlite/scrobblecast.sqlite "
    DELETE FROM histories 
    WHERE EXISTS (
        SELECT 1
        FROM histories h
        LEFT JOIN items i ON 
            h.__user = i.__user AND 
            h.__type = i.__type AND 
            h.uuid = i.uuid
        WHERE i.__user IS NULL
        AND histories.__user = h.__user
        AND histories.__type = h.__type
        AND histories.uuid = h.uuid
    );"

    format "#### Run dedup"
    # gum spin --title "Running dedup" --show-error -- node dedup.js
    node dedup.js

    format "#### Counts after DROP and dedup"
    echo "- Items - counts by user and type:"| $GUM_FMT_CMD
    sqlite3 --column --header data/sqlite/scrobblecast.sqlite "SELECT __user, __type, COUNT(*) as count FROM items GROUP BY __user, __type ORDER BY __user, __type;"
    
    echo "- Histories - counts by user and type:"| $GUM_FMT_CMD
    sqlite3 --column --header data/sqlite/scrobblecast.sqlite "SELECT __user, __type, COUNT(*) as count FROM histories GROUP BY __user, __type ORDER BY __user, __type;"
    
    echo "- Checking for orphaned histories..."| $GUM_FMT_CMD
    sqlite3 --column --header data/sqlite/scrobblecast.sqlite "
    SELECT h.__user, h.__type, h.uuid
    FROM histories h
    LEFT JOIN items i ON 
        h.__user = i.__user AND 
        h.__type = i.__type AND 
        h.uuid = i.uuid
    WHERE i.__user IS NULL
    ORDER BY h.__user, h.__type, h.uuid;"

    echo "- Digest Users after"| $GUM_FMT_CMD
    node digestUsers.js 2>&1|grep 'digest='

done

