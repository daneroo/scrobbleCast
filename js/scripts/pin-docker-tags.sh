#!/usr/bin/env bash
set -euo pipefail

# Source common functions
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common.sh"

# Get current git revision
GIT_REVISION=$(git describe --always --dirty)
# Build and test an image
build_and_test() {
  local BUILD_ARG=$1
  local KIND=$2
  local TAG_SUFFIX="${KIND,,}-${TAG}"  # lowercase KIND

  echo "  Building with ${BUILD_ARG}..."
  BUILD_OUTPUT=$(docker build --build-arg BASE_NODE_IMAGE="${BUILD_ARG}" --build-arg GIT_REVISION="${GIT_REVISION}" -t "scrape-tag-test:${TAG_SUFFIX}" . 2>&1)
  if [ $? -eq 0 ]; then
    VERSION_INFO=$(docker run --rm "scrape-tag-test:${TAG_SUFFIX}" node -e "const config = require('./lib/config'); console.log(JSON.stringify(config.version))" 2>/dev/null)
    if [ $? -eq 0 ]; then
      check_mark "${KIND}-based version info: ${VERSION_INFO}"
    else
      x_mark "${KIND} build successful, but failed to get version info"
    fi
  else
    x_mark "${KIND} build failed"
    echo "  Build output:"
    echo "$BUILD_OUTPUT"
  fi
}

# Tags to check
TAGS=("22-slim" "22-alpine")

(
  echo "## Checking Docker tags and building images"
  echo "You can use this script to get/update the current SHA for a tag,"
  echo "and build images with both the tag and the SHA."
  echo "These are meant to be used as build args for the Dockerfile,"
  echo "which represent the BASE_NODE_IMAGE"
  echo "- Current git revision: ${GIT_REVISION}"
) | $GUM_FMT_CMD


for TAG in "${TAGS[@]}"; do
  format "- Checking $TAG"
  
  # Get current SHA
  SHA=$(curl -s "https://registry.hub.docker.com/v2/repositories/library/node/tags/${TAG}" | jq -r .digest)
  echo "# As of $(date -I), these build args are equivalent:"
  echo "# ARG BASE_NODE_IMAGE=node:${TAG}"
  echo "# ARG BASE_NODE_IMAGE=node@${SHA}"
  echo
  
  # Build and test with tag
  build_and_test "node:${TAG}" "NAMED"
  
  # Build and test with SHA
  build_and_test "node@${SHA}" "SHA"
done

# Show image sizes
format "## Image sizes"
(
  echo "| Repository | Tag | Image ID | Size |"
  echo "|------------|-----|----------|------|"
  docker images scrape-tag-test --format "| {{.Repository}} | {{.Tag}} | {{.ID}} | {{.Size}} |"
) | $GUM_FMT_CMD

# Cleanup test images
if docker images scrape-tag-test -q | sort -u | xargs docker rmi -f >/dev/null 2>&1; then
  check_mark "Removed test images"
else
  x_mark "Failed to remove some test images"
fi 