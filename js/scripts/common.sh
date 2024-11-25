#!/usr/bin/env bash

# Common SSH configuration
SSH_KEY="$HOME/.ssh/scrobble-galois"
HOSTS=("dirac" "darwin" "d1-px1")

# Function to check SSH key existence - silent unless error
check_ssh_key() {
    if [ ! -f "$SSH_KEY" ]; then
        echo "✗ - SSH key not found: $SSH_KEY"
        echo "Please generate the SSH key using:"
        echo "  ssh-keygen -t ed25519 -f $SSH_KEY -C \"daniel-scrobble@galois\""
        return 1
    fi
    return 0
} 