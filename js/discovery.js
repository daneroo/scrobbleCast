'use strict'

// Copied/Moved to logcheck.js

// dependencies - core-public-internal
const log = require('./lib/log')
const nats = require('./lib/nats')

// const { JSONCodec } = require('nats')

main()
async function main() {
  log.info('Peer discovery')

  const subject = 'im.scrobblecast.scrape.discovery'
  const count = 100
  // const timeout = 1000
  const interval = 500

  try {
    // const nc = await nats.connectToNats() // just a resolve if we are connected

    // const jc = JSONCodec()

    for (let i = 1; i <= count; i++) {
      // get my peers: scatter => [{peerId}]
      {
        const peers = await nats.scatter(subject)
        console.log(`[${i}]: ${peers.length} peers`, JSON.stringify(peers))
      }

      if (interval) {
        await nats.delay(interval)
      }
    }
  } catch (err) {
    log.error(`nats error: ${err.message}`, err)
  }

  await closeGracefully('normalExit')
}

// Graceful shutdown
// see https://snyk.io/blog/10-best-practices-to-containerize-nodejs-web-applications-with-docker/
async function closeGracefully(signal) {
  log.info(`Received signal to terminate: ${signal}`)

  await Promise.all([nats.disconnectFromNats()])
  process.exit()
}
process.on('SIGINT', closeGracefully)
process.on('SIGTERM', closeGracefully)
