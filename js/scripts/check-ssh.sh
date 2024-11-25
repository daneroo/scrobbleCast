#!/usr/bin/env bash

# Source common functions and variables
source "$(dirname "$0")/common.sh"

format "## Checking SSH Key"
# Check SSH key first - will only output on error
if check_ssh_key; then
    check_mark "SSH key found: $SSH_KEY"
else
    exit 1
fi

originator=$(hostname -s)
echo
format "## Checking SSH Connectivity from ${originator} to Hosts: ${HOSTS[@]}"

any_failed=0
for host in "${HOSTS[@]}"; do
    if ssh -i "$SSH_KEY" -o BatchMode=yes -o ConnectTimeout=5 "$host" exit 2>/dev/null; then
        check_mark "SSH connection successful to $host"
    else
        x_mark "Cannot connect to $host using SSH key"
        echo "  To copy the key to $host, run:"
        echo "  ssh-copy-id -i $SSH_KEY $host"
        any_failed=1
    fi
done

exit $any_failed

