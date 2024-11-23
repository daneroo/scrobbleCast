#!/usr/bin/env bash

# Here we will verify that we have a proper setup to talk to all three hosts
# with ssh keys in place
# - This is meant to work from galois

SSH_KEY="$HOME/.ssh/scrobble-galois"

echo "## Checking SSH Key"
# Check if the SSH key exists
if [ ! -f "$SSH_KEY" ]; then
    echo "✗ - SSH key not found: $SSH_KEY"
    echo "Please generate the SSH key using:"
    echo "  ssh-keygen -t ed25519 -f $SSH_KEY -C \"daniel-scrobble@galois\""
    exit 1
else
    echo "✓ - SSH key found: $SSH_KEY"
fi

# If the key exists, validate that we can ssh without a password, using our key
# If not show the command to copy the key over to the destination hosts(s)
hosts=("dirac" "darwin" "d1-px1")

echo 
echo "## Checking Hosts: ${hosts[@]}"

for host in "${hosts[@]}"; do
    if ssh -i "$SSH_KEY" -o BatchMode=yes -o ConnectTimeout=5 "$host" exit 2>/dev/null; then
        echo "✓ - SSH connection successful to $host"
    else
        echo "✗ - Cannot connect to $host using SSH key"
        echo "  To copy the key to $host, run:"
        echo "  ssh-copy-id -i $SSH_KEY $host"
    fi
done

echo
echo "early exit"
exit 0

