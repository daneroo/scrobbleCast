#!/usr/bin/env bash

# Common SSH configuration
SSH_KEY="$HOME/.ssh/scrobble-galois"
HOSTS=("darwin" "d1-px1" "scast-hilbert")

# Formatting configuration
# could use this ENV for gum format theme
# export GUM_FORMAT_THEME="light"
#  gum confirm --help to see THEME
#  gum choose --help to see THEME
GUM_FMT_CMD="gum format --theme=light"

# Check for gum once
GUM_AVAILABLE=0
if command -v gum >/dev/null 2>&1; then
    GUM_AVAILABLE=1
fi

# ANSI color codes
GREEN="\033[32m"
RED="\033[31m"
RESET="\033[0m"

# Output formatting functions
check_mark() {
    echo -e "${GREEN}✓${RESET} - $1"
}

x_mark() {
    echo -e "${RED}✗${RESET} - $1"
}

# Format text - use gum if available, fallback to echo
format() {
    if [ "$GUM_AVAILABLE" = "1" ]; then
        echo "$1" | $GUM_FMT_CMD
    else
        echo "$1"
    fi
}

# Function to check SSH key existence - silent unless error
check_ssh_key() {
    if [ ! -f "$SSH_KEY" ]; then
        x_mark "SSH key not found: $SSH_KEY"
        echo "Please generate the SSH key using:"
        echo "  ssh-keygen -t ed25519 -f $SSH_KEY -C \"daniel-scrobble@galois\""
        return 1
    fi
    return 0
}