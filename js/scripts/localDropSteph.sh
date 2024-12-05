#!/usr/bin/env bash

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

# preDropSteph was taken at 16:10 i.e. 2024-11-28T21:10:00Z
# Host: dirac
# checkpoint generation=2024-11-28T21:10:00Z, digest=dd46da21737a5b00525199afc9353a420b1f6181c12c235a23c9514a1328596b, scope=item, elapsed=19.782
# Host: darwin
# checkpoint generation=2024-11-28T21:10:00Z, digest=dd46da21737a5b00525199afc9353a420b1f6181c12c235a23c9514a1328596b, scope=item, elapsed=23.675
# Host: d1-px1
# checkpoint generation=2024-11-28T21:10:00Z, digest=dd46da21737a5b00525199afc9353a420b1f6181c12c235a23c9514a1328596b, scope=item, elapsed=14.734

# Also note empty digest array:  echo -n '[]' |sha256sum
#  4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945

format "## Validate Drop Stephane"

# HOSTS=("dirac")

for host in "${HOSTS[@]}"; do
    format "### Host: ${host}"
    
    format "#### Restore Database"
    echo "- Copying backup"
    scp -p data/sqlite/scrobblecast-${host}-preDropSteph.sqlite data/sqlite/scrobblecast.sqlite;
    echo "- Confirm integrity host:${host} sha256sum:$(sha256sum data/sqlite/scrobblecast.sqlite)"
    
    # echo "- Digest Users before"| $GUM_FMT_CMD
    # node digestUsers.js 2>&1|grep 'digest='

    # format "#### Counts before DROP and dedup"
    # echo "- Items - counts by user and type:"| $GUM_FMT_CMD
    # sqlite3 --column --header data/sqlite/scrobblecast.sqlite "SELECT __user, __type, COUNT(*) as count FROM items GROUP BY __user, __type ORDER BY __user, __type;"    
    # echo "- Histories - counts by user and type:"| $GUM_FMT_CMD
    # sqlite3 --column --header data/sqlite/scrobblecast.sqlite "SELECT __user, __type, COUNT(*) as count FROM histories GROUP BY __user, __type ORDER BY __user, __type;"

    format "#### Performing DROP operations"
    echo "- Deleting from items..."
    sqlite3 data/sqlite/scrobblecast.sqlite "DELETE FROM items WHERE __user='stephane';"
    echo "- Deleting from histories..."
    sqlite3 data/sqlite/scrobblecast.sqlite "DELETE FROM histories WHERE __user='stephane' OR __user='stephAne';"

    echo "- Database size before VACUUM:"
    du -sk data/sqlite/scrobblecast.sqlite

    echo "- Running VACUUM to reclaim space..."
    sqlite3 data/sqlite/scrobblecast.sqlite "VACUUM;"

    echo "- Database size after VACUUM:"
    du -sk data/sqlite/scrobblecast.sqlite

    format "#### Counts after DROP"
    echo "- Items - counts by user and type:"| $GUM_FMT_CMD
    sqlite3 --column --header data/sqlite/scrobblecast.sqlite "SELECT __user, __type, COUNT(*) as count FROM items GROUP BY __user, __type ORDER BY __user, __type;"
    
    echo "- Histories - counts by user and type:"| $GUM_FMT_CMD
    sqlite3 --column --header data/sqlite/scrobblecast.sqlite "SELECT __user, __type, COUNT(*) as count FROM histories GROUP BY __user, __type ORDER BY __user, __type;"

    echo "- Digest Users after"
    node digestUsers.js 2>&1|grep 'digest='

    format "#### Snapshot Generation"
    echo "- Removing existing snapshots..."
    rm -rf data/snapshots/
    
    echo "- Creating new snapshot (.jsonl)..."
    gum spin --title "Creating snapshot (.jsonl)" --show-error node snapshots.js
    
    echo "- Checking new snapshot digest:"
    ./directory-digester-reference --verbose data/snapshots/monthly/daniel/ 2>/dev/null |head -1

    format "#### Database Restore Test"
    echo "- Wiping database..."
    rm -f data/sqlite/scrobblecast.sqlite
    
    echo "- Restoring from snapshots..."
    gum spin --title "Restoring from snapshots" --show-error -- node restore.js
    
    # Need to dedup after restore, if you want histories
    format "#### Counts after restore"
    echo "- Items - counts by user and type:"| $GUM_FMT_CMD
    sqlite3 --column --header data/sqlite/scrobblecast.sqlite "SELECT __user, __type, COUNT(*) as count FROM items GROUP BY __user, __type ORDER BY __user, __type;"
    echo "- Histories - counts by user and type:"| $GUM_FMT_CMD
    sqlite3 --column --header data/sqlite/scrobblecast.sqlite "SELECT __user, __type, COUNT(*) as count FROM histories GROUP BY __user, __type ORDER BY __user, __type;"
    
    echo "- Verifying restored digests..."
    node digestUsers.js 2>&1|grep 'digest='
done

