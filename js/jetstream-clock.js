'use strict'

// dependencies - core-public-internal
const log = require('./lib/log')
const nats = require('./lib/nats')

const { JSONCodec } = require('nats')

main()
async function main () {
  log.info('JetStream Clock Test')

  const streamName = 'clockstream'
  const subjects = ['test.clock', 'test.clock.>']
  const maxAge = 60e9 // 1 minute in nanoseconds
  const deltaMS = 6e3 // 6 seconds in milliseconds

  try {
    const stream = await nats.findOrCreateStream(streamName, subjects, maxAge)
    const asyncMessageIterator = nats.replayMessages(
      stream,
      subjects[2],
      deltaMS
    )
    const jc = JSONCodec()

    for await (const m of asyncMessageIterator) {
      log.debug('--', m.seq, m.info.pending, m.subject, jc.decode(m.data))
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
