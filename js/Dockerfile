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
# - Find the latest lts alpine tag (like 14.17.6-alpine3.11)
# - Find the SHA: docker pull node:lts-alpine|grep Digest
# 14.17.6-alpine3.11 == lts-alpine @ 2021-09-11
FROM node:14.17.6-alpine3.11@sha256:8c94a0291133e16b92be5c667e0bc35930940dfa7be544fb142e25f8e4510a45

RUN apk add dumb-init
ENV NODE_ENV production
USER node
WORKDIR /usr/src/app
COPY --chown=node:node --from=build /usr/src/app/node_modules /usr/src/app/node_modules
COPY --chown=node:node . /usr/src/app

# Default port
EXPOSE 8000

CMD ["dumb-init", "node", "server.js"]

