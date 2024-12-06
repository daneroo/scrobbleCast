#!/usr/bin/env bash

# Source common functions and variables
source "$(dirname "$0")/common.sh"

# How many days ago to sync from by default
SYNC_DAYS_AGO=1

# Set 'since' to the first script argument, or SYNC_DAYS_AGO days ago if not provided
since="${1:-$(date -v-${SYNC_DAYS_AGO}d +%Y-%m-%d)}"

# Function to sync target pulling from source
sync_host() {
    local target=$1
    local source=$2
    format "- ${target} <- ${source}"
    command="docker exec -t js-scrape-1 node sync http://${source}.imetrical.com:8000/api ${since}"
    echo "    ssh -i \"$SSH_KEY\" \"$target\" \"$command\""
    ssh -i "$SSH_KEY" "$target" "$command" | grep 'Sync missing'
}

# Check SSH key first
check_ssh_key || exit 1

format "## Syncing Hosts"
echo -e "- Hosts: $(IFS=, ; echo "${HOSTS[*]}")\n- Since: ${since}" | $GUM_FMT_CMD

# Generate all distinct pairs from $HOSTS
for ((i=0; i<${#HOSTS[@]}; i++)); do
    for ((j=i+1; j<${#HOSTS[@]}; j++)); do
        host1="${HOSTS[i]}"
        host2="${HOSTS[j]}"
        format "## Syncing pair: ${host1} <-> ${host2}"
        sync_host "$host1" "$host2"
        sync_host "$host2" "$host1"
    done
done
