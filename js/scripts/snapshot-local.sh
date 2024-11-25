#!/usr/bin/env bash

# Source common functions and variables
source "$(dirname "$0")/common.sh"

format '## Validating presence of `data/snapshots/current/`'
echo "  ..optionally, to avoid pushing other hosts 'current':"
echo "  sudo rm -rf data/snapshots/current/"

format '## Creating snapshot DB -> `./data/snapshots`'
echo docker compose run --rm scrape node snapshots.js
if [ $? -ne 0 ]; then
    echo "${red_xmark} Snapshot creation failed"
    exit 1
fi

format '## Uploading `./data/snapshots/` to S3'
echo npm run snapshot
if [ $? -ne 0 ]; then
    echo "${red_xmark} Snapshot upload failed"
    exit 1
fi

echo "${green_check} Snapshot process completed successfully"