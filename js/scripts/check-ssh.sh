#!/usr/bin/env bash

# Source common functions and variables
source "$(dirname "$0")/common.sh"

echo "## Checking SSH Key"
# Check SSH key first - will only output on error
if check_ssh_key; then
    echo "✓ - SSH key found: $SSH_KEY"
else
    exit 1
fi

# If the key exists, validate that we can ssh without a password
originator=$(hostname -s)

echo
echo "## Checking SSH Connectivity from ${originator} to Hosts: ${HOSTS[@]}"

any_failed=0
for host in "${HOSTS[@]}"; do
    # Try SSH connection with:
    #   -i "$SSH_KEY"         : Use our specific SSH key
    #   -o BatchMode=yes      : Don't allow password auth, fail immediately if key auth fails
    #   -o ConnectTimeout=5   : Don't hang, timeout after 5 seconds if host unreachable
    #   exit                  : Just try to connect and exit immediately
    #   2>/dev/null          : Hide SSH error messages
    if ssh -i "$SSH_KEY" -o BatchMode=yes -o ConnectTimeout=5 "$host" exit 2>/dev/null; then
        echo "✓ - SSH connection successful to $host"
    else
        echo "✗ - Cannot connect to $host using SSH key"
        echo "  To copy the key to $host, run:"
        echo "  ssh-copy-id -i $SSH_KEY $host"
        any_failed=1
    fi
done

exit $any_failed

