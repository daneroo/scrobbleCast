# Best Dockerfile practices from Snyk
# https://snyk.io/blog/10-best-practices-to-containerize-nodejs-web-applications-with-docker/

# Build the image, in case we need build tools
# Is it ok to mix npm install in node:lts and use it in node:alpine?
FROM node:lts AS build
# Corepack needs to be pinned (at least to major version) - and should Match CI (CircleCI and GitHub Actions)
RUN corepack enable && corepack prepare pnpm@9
WORKDIR /usr/src/app
COPY package.json pnpm-lock.yaml /usr/src/app/
RUN pnpm install --frozen-lockfile --loglevel error

# --------------------------------------------------
# Production image
# To refresh the image
# - Find the latest lts alpine tag (like 16.14.0-alpine3.15)
# - Find the SHA: docker pull node:lts-alpine|grep Digest
# node:22.11.0-alpine3.20 == node:lts-alpine @ 2024-11-22
FROM node:22.11.0-alpine3.20@sha256:b64ced2e7cd0a4816699fe308ce6e8a08ccba463c757c00c14cd372e3d2c763e

RUN apk add dumb-init
ENV NODE_ENV production
USER node
WORKDIR /usr/src/app
COPY --chown=node:node --from=build /usr/src/app/node_modules /usr/src/app/node_modules
COPY --chown=node:node . /usr/src/app

# Default port
EXPOSE 8000

CMD ["dumb-init", "node", "server.js"]

