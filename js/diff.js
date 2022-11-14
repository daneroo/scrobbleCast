'use strict'

// dependencies - core-public-internal
const log = require('./lib/log')
// const nats = require('./lib/nats')

main()

async function main() {
  log.info('Starting diff.js')
  await closeGracefully('normalExit')
}

// Graceful shutdown
// see https://snyk.io/blog/10-best-practices-to-containerize-nodejs-web-applications-with-docker/
async function closeGracefully(signal) {
  log.info(`Received signal to terminate: ${signal}`)

  await Promise.all([
    /* nats.disconnectFromNats() */
  ])
  process.exit()
}
process.on('SIGINT', closeGracefully)
process.on('SIGTERM', closeGracefully)
