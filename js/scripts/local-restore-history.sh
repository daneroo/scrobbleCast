#!/usr/bin/env bash

# This script restores the history table by leveraging dedup's ability to regenerate it.
# 
# The history table is essentially a cache of item changes, where:
# 1. Items table is the source of truth
# 2. History table contains the accumulated changes per uuid
# 3. History entries are also uniquely identified by their digest (content-addressed)
# 4. dedup.js can fully regenerate histories by streaming all items (in dedupOrder)
#
# This is why we can:
#   a) DROP the entire histories table
#   b) Run dedup to regenerate it from items
#   c) Get back exactly the same histories (enforced by content addressing)

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

# override hosts
HOSTS=("dirac")

format "## Validate Regenerating history (digests)"

for host in "${HOSTS[@]}"; do
    format "### Host: ${host}"
    
    format "#### Restore Database"
    echo "- Copying backup"
    scp -p data/sqlite/scrobblecast-${host}-preDropSteph.sqlite data/sqlite/scrobblecast.sqlite;
    echo "- Confirm integrity host:${host} sha256sum:$(sha256sum data/sqlite/scrobblecast.sqlite)"
    
    echo "- Digest Users before"
    node digestUsers.js 2>&1|grep 'digest='

    format "#### Counts before DROP and dedup"
    echo "- Histories table counts by user:"
    sqlite3 data/sqlite/scrobblecast.sqlite "SELECT __user, COUNT(*) FROM histories GROUP BY __user;"

    format "#### Performing selective DROP operations"
    echo "- Deleting all from histories..."
    sqlite3 data/sqlite/scrobblecast.sqlite "DELETE FROM histories;"

    format "#### Run dedup"
    # gum spin --title "Running dedup" --show-error -- node dedup.js
    node dedup.js

    format "#### Counts after DROP and dedup"
    echo "- Histories table counts by user:"
    sqlite3 data/sqlite/scrobblecast.sqlite "SELECT __user, COUNT(*) FROM histories GROUP BY __user;"

    echo "- Digest Users after"
    node digestUsers.js 2>&1|grep 'digest='

done

