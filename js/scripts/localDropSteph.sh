#!/usr/bin/env bash

# Source common functions and variables
source "$(dirname "$0")/common.sh"

# preDropSteph was taken at 16:10 i.e. 2024-11-28T21:10:00Z
# Host: dirac
# checkpoint generation=2024-11-28T21:10:00Z, digest=dd46da21737a5b00525199afc9353a420b1f6181c12c235a23c9514a1328596b, scope=item, elapsed=19.782
# Host: darwin
# checkpoint generation=2024-11-28T21:10:00Z, digest=dd46da21737a5b00525199afc9353a420b1f6181c12c235a23c9514a1328596b, scope=item, elapsed=23.675
# Host: d1-px1
# checkpoint generation=2024-11-28T21:10:00Z, digest=dd46da21737a5b00525199afc9353a420b1f6181c12c235a23c9514a1328596b, scope=item, elapsed=14.734

# Also note empty digest array:  echo -n '[]' |sha256sum
#  4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945

format "## Validation Drop Stephane Procedure"

for host in "${HOSTS[@]}"; do
    format "### Host: ${host}"
    echo "copying backup"
    scp -p data/sqlite/scrobblecast-${host}-preDropSteph.sqlite data/sqlite/scrobblecast.sqlite;
    echo "confirm integrity host:${host} sha256sum:$(sha256sum data/sqlite/scrobblecast.sqlite)"
    
    echo "digest Users before"
    node digestUsers.js 2>&1|grep 'digest='

    format "### Counts before DROP"
    echo "Items table counts by user:"
    sqlite3 data/sqlite/scrobblecast.sqlite "SELECT __user, COUNT(*) FROM items GROUP BY __user;"
    echo "Histories table counts by user:"
    sqlite3 data/sqlite/scrobblecast.sqlite "SELECT __user, COUNT(*) FROM histories GROUP BY __user;"

    format "### Performing DROP operations"
    echo "Deleting from items..."
    sqlite3 data/sqlite/scrobblecast.sqlite "DELETE FROM items WHERE __user='stephane';"
    echo "Deleting from histories..."
    sqlite3 data/sqlite/scrobblecast.sqlite "DELETE FROM histories WHERE __user='stephane' OR __user='stephAne';"

    format "### Counts after DROP"
    echo "Items table counts by user:"
    sqlite3 data/sqlite/scrobblecast.sqlite "SELECT __user, COUNT(*) FROM items GROUP BY __user;"
    echo "Histories table counts by user:"
    sqlite3 data/sqlite/scrobblecast.sqlite "SELECT __user, COUNT(*) FROM histories GROUP BY __user;"

    echo "digest Users after"
    node digestUsers.js 2>&1|grep 'digest='
done 

