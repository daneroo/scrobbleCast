# Best Dockerfile practices from Snyk
# https://snyk.io/blog/10-best-practices-to-containerize-nodejs-web-applications-with-docker/

# Build the image, in case we need build tools
# Is it ok to mix npm insta;; in node:lts and use it in node:alpine?
FROM node:lts AS build  
WORKDIR /usr/src/app
COPY package*.json /usr/src/app/
RUN npm ci --only=production

# --------------------------------------------------
# Production image
# To refresh the image
# - Find the latest lts alpine tag (like 16.14.0-alpine3.15)
# - Find the SHA: docker pull node:lts-alpine|grep Digest
# 16.14.0-alpine3.15 == lts-alpine @ 2022-02-24
FROM node:16.14.0-alpine3.15@sha256:2c6c59cf4d34d4f937ddfcf33bab9d8bbad8658d1b9de7b97622566a52167f2b

RUN apk add dumb-init
ENV NODE_ENV production
USER node
WORKDIR /usr/src/app
COPY --chown=node:node --from=build /usr/src/app/node_modules /usr/src/app/node_modules
COPY --chown=node:node . /usr/src/app

# Default port
EXPOSE 8000

CMD ["dumb-init", "node", "server.js"]

