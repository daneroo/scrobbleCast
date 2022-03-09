'use strict'

// dependencies - core-public-internal
const log = require('./lib/log')
const nats = require('./lib/nats')

const { JSONCodec } = require('nats')

main()
async function main () {
  log.info('JetStream setup for im.scrobblecast.scrape.digest')

  const streamName = 'scrobblecastDigest'
  const subjects = [
    'im.scrobblecast.scrape.digest',
    'im.scrobblecast.scrape.digest.>'
  ]

  const maxAge = 86400e9 // 24h in nanoseconds (stream retention)
  const deltaMS = 7200e3 // 2h in ms

  try {
    const stream = await nats.findOrCreateStream(streamName, subjects, maxAge)
    const asyncMessageIterator = nats.replayMessages(
      stream,
      subjects[2],
      deltaMS
    )
    const jc = JSONCodec()

    for await (const m of asyncMessageIterator) {
      log.info('--', m.seq, m.info.pending, m.subject, jc.decode(m.data))
    }
  } catch (err) {
    log.error(`nats error: ${err.message}`, err)
  }

  await closeGracefully('normalExit')
}

// Graceful shutdown
// see https://snyk.io/blog/10-best-practices-to-containerize-nodejs-web-applications-with-docker/
async function closeGracefully (signal) {
  log.info(`Received signal to terminate: ${signal}`)

  await Promise.all([nats.disconnectFromNats()])
  process.exit()
}
process.on('SIGINT', closeGracefully)
process.on('SIGTERM', closeGracefully)
