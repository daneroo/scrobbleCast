# Best Dockerfile practices from Snyk
# https://snyk.io/blog/10-best-practices-to-containerize-nodejs-web-applications-with-docker/

# Build the image, in case we need build tools
# Is it ok to mix npm insta;; in node:lts and use it in node:alpine?
FROM node:lts AS build
RUN corepack enable && corepack prepare pnpm@latest
WORKDIR /usr/src/app
COPY package.json pnpm-lock.yaml /usr/src/app/
RUN pnpm install --frozen-lockfile --loglevel error

# --------------------------------------------------
# Production image
# To refresh the image
# - Find the latest lts alpine tag (like 16.14.0-alpine3.15)
# - Find the SHA: docker pull node:lts-alpine|grep Digest
# 16.14.0-alpine3.15 == lts-alpine @ 2022-02-24
FROM node:18.12.1-alpine3.16@sha256:67373bd5d90ea600cb5f0fa58d7a5a4e6ebf50b6e05c50c1d1cc22df5134db43

RUN apk add dumb-init
ENV NODE_ENV production
USER node
WORKDIR /usr/src/app
COPY --chown=node:node --from=build /usr/src/app/node_modules /usr/src/app/node_modules
COPY --chown=node:node . /usr/src/app

# Default port
EXPOSE 8000

CMD ["dumb-init", "node", "server.js"]

