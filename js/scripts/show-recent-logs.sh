#!/usr/bin/env bash

SSH_KEY="$HOME/.ssh/scrobble-galois"

# Define hosts array (same as other scripts)
hosts=("darwin" "dirac" "d1-px1")

# Default number of lines to show
echo "## Checking SSH Key"
if [ ! -f "$SSH_KEY" ]; then
    echo "✗ - SSH key not found: $SSH_KEY"
    echo "Please run check-ssh.sh first to set up SSH keys"
    exit 1
else
    echo "✓ - SSH key found: $SSH_KEY"
    echo
fi

LAST_LINES="5"

echo "## Recent dedup tasks (elapsed) (last ${LAST_LINES} entries per host)"
echo

for host in "${hosts[@]}"; do
    echo "### Host: ${host}"
    ssh -i "$SSH_KEY" "$host" "docker logs js-scrape-1 2>&1 | grep 'Task done task=dedup,' | tail -${LAST_LINES}" | \
    grep --color=always 'Task done task=dedup,\|elapsed=[0-9.]*'
done 
echo

echo "## Recent dedupStamp tasks (elapsed) (last ${LAST_LINES} entries per host)"
for host in "${hosts[@]}"; do
    echo "### Host: ${host}"
    ssh -i "$SSH_KEY" "$host" "docker logs js-scrape-1 2>&1 | grep 'Task done task=dedupStamp,' | tail -${LAST_LINES}" | \
    grep --color=always 'Task done task=dedupStamp,\|elapsed=[0-9.]*'
done 
echo

echo "## Recent checkpoints for items (last ${LAST_LINES} entries per host)"
for host in "${hosts[@]}"; do
    echo "### Host: ${host}"
    ssh -i "$SSH_KEY" "$host" "docker logs js-scrape-1 2>&1 | grep 'checkpoint.*scope=item' | tail -${LAST_LINES}" | \
    grep --color=always 'checkpoint\|digest=[a-f0-9]*'
done 
echo

echo "## Template commands (DIY):"
echo "For each host, you can use:"
for host in "${hosts[@]}"; do
    echo "ssh -i $SSH_KEY $host \"docker logs js-scrape-1 2>&1 | grep 'YOUR-PATTERN' | tail -5\""
done
