#!/usr/bin/env bash

SSH_KEY="$HOME/.ssh/scrobble-galois"

# Set 'since' to the first script argument, or use a default value if not provided
since="${1:-2024-11-01}"
hosts=("dirac" "darwin" "d1-px1")

echo "## Checking SSH Key"
if [ ! -f "$SSH_KEY" ]; then
    echo "✗ - SSH key not found: $SSH_KEY"
    echo "Please run check-ssh.sh first to set up SSH keys"
    exit 1
else
    echo "✓ - SSH key found: $SSH_KEY"
    echo
fi

echo "Syncing all pairs since ${since}"
echo "Hosts: ${hosts[@]}"

for host in "${hosts[@]}"; do
    echo "## From Host: ${host}"
    for client in "${hosts[@]}"; do
        if [ "$host" != "$client" ]; then
            echo "  Sync with: ${client}"
            command="docker exec -t js-scrape-1 time node sync http://${client}.imetrical.com:8000/api ${since}"
            echo "    ssh -i \"$SSH_KEY\" \"$host\" \"$command\""
            ssh -i "$SSH_KEY" "$host" "$command"
        else
            echo "  Skipping self: ${host}"
        fi
    done
done
