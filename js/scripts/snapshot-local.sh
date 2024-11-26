#!/usr/bin/env bash

# Source common functions and variables
source "$(dirname "$0")/common.sh"

# Determine base and data directories
BASE_DIR=$(realpath "$(dirname "$0")/..")
DATA_DIR="${BASE_DIR}/data"
S3_CONFIG="${BASE_DIR}/s3cfg.env"

# Define S3 command with common options
S3_CMD="docker run --rm --env-file $S3_CONFIG -v ${DATA_DIR}/snapshots:/data/snapshots amazon/aws-cli s3"

format '## Validating environment'

# Initialize validation status
validation_failed=0

# Check for s3cfg.env
if [ ! -f "$S3_CONFIG" ]; then
    x_mark "S3 config file not found: $S3_CONFIG"
    echo "This script requires s3cfg.env with AWS credentials"
    validation_failed=1
else
    check_mark "S3 config file found: $S3_CONFIG"
fi

# Verify data directory exists
if [ ! -d "$DATA_DIR" ]; then
    x_mark "Data directory not found: $DATA_DIR"
    echo "This script should be run from the directory containing the Justfile"
    validation_failed=1
else
    check_mark "Data directory confirmed: $DATA_DIR"
fi

# Test S3 access
format '## Testing S3 connectivity'
if ! $S3_CMD ls s3://scrobblecast/snapshots/ >/dev/null 2>&1; then
    x_mark "S3 access failed. Check your credentials in s3cfg.env"
    validation_failed=1
else
    check_mark "S3 access confirmed"
fi

# Exit if any validation failed
if [ $validation_failed -ne 0 ]; then
    x_mark "Environment validation failed"
    exit 1
fi

format '## Cleaning up presence of files in `data/snapshots/current/`'

# Store find results first - using ls for portability
current_files=$(cd "$DATA_DIR" 2>/dev/null && find snapshots/current -type f -exec ls -lh {} \; | awk '{print $5 "|" $6 " " $7 " " $8 "|" $9}')

if [ -n "$current_files" ]; then
    # Create markdown table of files
    (
        echo "| Size | Modified | Path |"
        echo "|------|----------|------|"
        echo "$current_files" | \
            awk -F'|' '{print "| " $1 " | " $2 " | " $3 " |"}'
    ) | $GUM_FMT_CMD
    
    if gum confirm "Remove existing files in data/snapshots/current? (you should)"; then
        rm -rf "$DATA_DIR/snapshots/current"
        check_mark "Removed data/snapshots/current"
    else
        echo "Keeping existing data/snapshots/current"
    fi
else
    check_mark "No files found in data/snapshots/current"
fi

format '## Creating snapshot DB -> `./data/snapshots`'
docker compose run --rm scrape node snapshots.js

if [ $? -ne 0 ]; then
    x_mark "Snapshot creation failed"
    exit 1
else
    check_mark "Snapshot creation completed"
fi

format '## Previewing S3 upload'
$S3_CMD sync --dryrun /data/snapshots/ s3://scrobblecast/snapshots

if [ $? -ne 0 ]; then
    x_mark "S3 sync preview failed"
    exit 1
fi

if ! gum confirm "Proceed with S3 upload?"; then
    echo "Upload cancelled"
    exit 1
fi

format '## Uploading `./data/snapshots/` to S3'
$S3_CMD sync /data/snapshots/ s3://scrobblecast/snapshots

if [ $? -ne 0 ]; then
    x_mark "Snapshot upload failed"
    exit 1
else
    check_mark "Snapshot upload completed"
fi

check_mark "Snapshot process completed successfully"