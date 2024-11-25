#!/usr/bin/env bash

# Source common functions and variables
source "$(dirname "$0")/common.sh"

# Define hosts array
hosts=("darwin" "dirac" "d1-px1")

format "## Checking versions"
for host in "${hosts[@]}"; do
    version=$(curl -s "http://${host}.imetrical.com:8000/api/version")
    echo "${host} ${version}"
done

format "## Checking status"
for host in "${hosts[@]}"; do
    status=$(curl -s "http://${host}.imetrical.com:8000/api/status")
    echo "${host} ${status}"
done

format "## Checking digests"
for host in "${hosts[@]}"; do
    digest=$(curl -s "http://${host}.imetrical.com:8000/api/digests" | shasum -a 256)
    echo "${host} ${digest}"
done