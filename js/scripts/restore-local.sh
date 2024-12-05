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

# Ensure script is called from Justfile
if [[ "${FROM_JUSTFILE}" != "true" ]]; then
    x_mark "This script should only be run via 'just restore'"
    validation_failed=1
else
    check_mark "Script invoked correctly via Justfile"
fi

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

format '## Previewing S3 download'
$S3_CMD sync --dryrun s3://scrobblecast/snapshots/ /data/snapshots/

if [ $? -ne 0 ]; then
    x_mark "S3 sync preview failed"
    exit 1
fi

if ! gum confirm "Proceed with S3 download?"; then
    echo "Download cancelled"
    exit 1
fi

format '## Downloading from S3 -> `./data/snapshots/`'
$S3_CMD sync s3://scrobblecast/snapshots/ /data/snapshots/

if [ $? -ne 0 ]; then
    x_mark "Snapshot download failed"
    exit 1
else
    check_mark "Snapshot download completed"
fi

format '## Checking presence of files in `data/snapshots/current/`'

# Store find results first - using ls for portability
current_files=$(cd "$DATA_DIR" 2>/dev/null && find snapshots/current -type f -name "*.jsonl" -exec ls -lh {} \; | awk '{print $5 "|" $9}')

if [ -n "$current_files" ]; then
    # Create markdown table header
    (
        echo "| Size | Last Record | Path |"
        echo "|------|-------------|------|"
        # For each file, get size and last record timestamp
        echo "$current_files" | while IFS='|' read -r size path; do
            last_stamp=$(tail -1 "$DATA_DIR/$path" | jq -r '.__stamp // "N/A"')
            echo "| $size | $last_stamp | $path |"
        done
    ) | $GUM_FMT_CMD
else
    check_mark "No .jsonl files found in data/snapshots/current"
fi

format '## Restoring snapshot `./data/snapshots` -> DB'
if ! gum confirm "Proceed with database restore?"; then
    echo "Restore cancelled"
    exit 1
fi

docker compose run --rm scrape node restore.js

if [ $? -ne 0 ]; then
    x_mark "Database restore failed"
    exit 1
else
    check_mark "Database restore completed"
fi

check_mark "Restore process completed successfully" 