# Best Dockerfile practices from Snyk
# https://snyk.io/blog/10-best-practices-to-containerize-nodejs-web-applications-with-docker/


# Important notes:
# - Always use same base image for both build and prod stages to ensure binary compatibility
# - Using Alpine for both stages works well on both arm64 and amd64
# - Multi-stage build removes build tools and pnpm from final image
# - Final image sizes:
#   - Alpine: ~242MB
#   - Debian slim: ~330MB

# Git revision to expose as env var in the final image, obtained from `git describe --always --dirty`
# Top-level declaration needed for docker-compose build args, redeclared in final stage where used
ARG GIT_REVISION
# Using 22-alpine without SHA for now to allow security updates, and reasonable reproducibility
ARG BASE_NODE_IMAGE=node:22-alpine
# Other options: see `scripts/pin-docker-tags.sh`
# For SHA256 pinning:
#   To get current SHA for a tag, e.g. 22-alpine:
# curl -s "https://registry.hub.docker.com/v2/repositories/library/node/tags/22-alpine" | jq .digest
# As of 2024-12-06, these build args are equivalent:
# ARG BASE_NODE_IMAGE=node:22-alpine
# ARG BASE_NODE_IMAGE=node@sha256:96cc8323e25c8cc6ddcb8b965e135cfd57846e8003ec0d7bcec16c5fd5f6d39f
# As of 2024-12-06, these build args are equivalent:
# ARG BASE_NODE_IMAGE=node:22-slim
# ARG BASE_NODE_IMAGE=node@sha256:a4b757cd491c7f0b57f57951f35f4e85b7e1ad54dbffca4cf9af0725e1650cd8

# Build stage - includes build tools and pnpm
FROM ${BASE_NODE_IMAGE} AS build

# Add build dependencies for native modules (sqlite3 requires these)
RUN apk add --no-cache python3 py3-setuptools make g++

# Corepack needs to be pinned (at least to major version) - and should Match CI (GitHub Actions)
RUN corepack enable && corepack prepare pnpm@9
WORKDIR /usr/src/app
COPY package.json pnpm-lock.yaml /usr/src/app/
RUN pnpm install --frozen-lockfile --loglevel error

# Production stage
FROM ${BASE_NODE_IMAGE}

# Redeclare the build arg in this stage
ARG GIT_REVISION

# Convert build arg to env so it persists in the final image
ENV GIT_REVISION=${GIT_REVISION}

# Install dumb-init based on the base image
# This is a distro-neutral way to install dumb-init
RUN if [ -f /etc/alpine-release ]; then \
        apk add --no-cache dumb-init; \
    else \
        apt-get update && apt-get install -y --no-install-recommends dumb-init && rm -rf /var/lib/apt/lists/*; \
    fi

ENV NODE_ENV=production
USER node
WORKDIR /usr/src/app
COPY --chown=node:node --from=build /usr/src/app/node_modules /usr/src/app/node_modules
COPY --chown=node:node . /usr/src/app

# Default port
EXPOSE 8000

CMD ["dumb-init", "node", "server.js"]

