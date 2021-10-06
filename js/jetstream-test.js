'use strict'

// dependencies - core-public-internal
const config = require('./lib/config')
const log = require('./lib/log')
const nats = require('./lib/nats')

log.info('JetStream Test', { nats: config.nats })
// nats.connectToNats()

main()
async function main () {
  log.info('JetStream Body')
  const nc = await nats.connectToNats() // just a resolve if we are connected
  // nc.jetstream()
  const jsm = await nc.jetstreamManager()
  await jsm.streams.add({ name: 'test', subjects: ['test.*'] })

  // create a jetstream client:

  // TODO server is not connected yet!
  const js = nc.jetstream()

  // to publish messages to a stream:
  const pping = await js.publish('test.ping')

  // the jetstream returns an acknowledgement with the
  // stream that captured the message, it's assigned sequence
  // and whether the message is a duplicate.
  const stream = pping.stream
  const seq = pping.seq
  const duplicate = pping.duplicate
  log.info('publish to stream', { stream, seq, duplicate })

  try {
    const msg = await js.pull(stream, 'test')
    msg.ack()
  } catch (err) {
    log.error('subscribe to stream', { err })
  }

  // from nats cli:
  // nats str ls
  // nats str view test
  // nats str sub test
}

// Graceful shutdown
// see https://snyk.io/blog/10-best-practices-to-containerize-nodejs-web-applications-with-docker/
async function closeGracefully (signal) {
  log.info(`Received signal to terminate: ${signal}`)

  await Promise.all([
    nats.disconnectFromNats()
  ])
  process.exit()
}
process.on('SIGINT', closeGracefully)
process.on('SIGTERM', closeGracefully)
