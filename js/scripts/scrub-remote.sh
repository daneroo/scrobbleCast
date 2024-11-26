#!/usr/bin/env bash

# Source common functions and variables
source "$(dirname "$0")/common.sh"

# Check SSH key first
check_ssh_key || exit 1

format "## Running scrub on remote hosts"

for host in "${HOSTS[@]}"; do
    format "### Host: ${host}"
    ssh -i "$SSH_KEY" "$host" "docker exec -t js-scrape-1 node scrub.js"
done
