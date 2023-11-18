#!/usr/bin/env bash

# Set 'since' to the first script argument, or use a default value if not provided
since="${1:-2001-01-01}"
hosts=("dirac" "darwin" "d1-px1")

echo "Syncing all pairs since ${since}"
echo "Hosts: ${hosts[@]}"

for host in "${hosts[@]}"; do
    echo "## From Host: ${host}"
    for client in "${hosts[@]}"; do
        if [ "$host" != "$client" ]; then
            echo "  Sync with: ${client}"
            command="docker exec -t js-scrape-1 time node sync http://${client}.imetrical.com:8000/api ${since}"
            echo "    ssh \"$host\" \"$command\""
            ssh "$host" "$command"
        else
            echo "  Skipping self: ${host}"
        fi
    done
done
