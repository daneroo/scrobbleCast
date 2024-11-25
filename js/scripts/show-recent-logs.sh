#!/usr/bin/env bash

# Source common functions and variables
source "$(dirname "$0")/common.sh"

# Check SSH key first
check_ssh_key || exit 1

LAST_LINES="5"

echo "## Recent dedup tasks (elapsed) (last ${LAST_LINES} entries per host)"
echo

for host in "${HOSTS[@]}"; do
    echo "### Host: ${host}"
    ssh -i "$SSH_KEY" "$host" "docker logs js-scrape-1 2>&1 | grep 'Task done task=dedup,' | tail -${LAST_LINES}" | \
    grep --color=always 'Task done task=dedup,\|elapsed=[0-9.]*'
done 
echo

echo "## Recent dedupStamp tasks (elapsed) (last ${LAST_LINES} entries per host)"
for host in "${HOSTS[@]}"; do
    echo "### Host: ${host}"
    ssh -i "$SSH_KEY" "$host" "docker logs js-scrape-1 2>&1 | grep 'Task done task=dedupStamp,' | tail -${LAST_LINES}" | \
    grep --color=always 'Task done task=dedupStamp,\|elapsed=[0-9.]*'
done 
echo

echo "## Recent checkpoints for items (last ${LAST_LINES} entries per host)"
for host in "${HOSTS[@]}"; do
    echo "### Host: ${host}"
    ssh -i "$SSH_KEY" "$host" "docker logs js-scrape-1 2>&1 | grep 'checkpoint.*scope=item' | tail -${LAST_LINES}" | \
    grep --color=always 'checkpoint\|digest=[a-f0-9]*'
done 
echo

echo "## Template commands (DIY):"
echo "For each host, you can use:"
for host in "${HOSTS[@]}"; do
    echo "ssh -i $SSH_KEY $host \"docker logs js-scrape-1 2>&1 | grep 'YOUR-PATTERN' | tail -5\""
done
