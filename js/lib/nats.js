// Simplest possible nats client just to publish our events

// dependencies - core-public-internal
const { connect, JSONCodec } = require('nats')
const { ulid } = require('ulid')
const config = require('./config')
const log = require('./log')

exports = module.exports = {
  publish,
  connectToNats,
  disconnectFromNats
}

async function publish (subject, payload = {}) {
  const nc = await connectToNats() // just a resolve if we are connected
  if (!nc) {
    log.warn('Nats connection not available, but will retry on next publish')
    return
  }
  // log.debug(`>> |${subject}|`, JSON.stringify(payload))
  const jc = JSONCodec() // can this object be shared? - recreate every time for now
  nc.publish(`im.scrobblecast.scrape.${subject}`, jc.encode({
    id: ulid(),
    host: config.hostname,
    ...payload
  }))
}

const connectionOptions = {
  name: 'scrobblecast.scrape',
  servers: config.nats.servers,
  maxReconnectAttempts: -1,
  // waitOnFirstConnect: true, // not sure if this is a good idea
  verbose: true
}

// This is a singleton. i.e. latch variable for single permanent connection object (Promise)
// it is a var to prevent hoisting error
// on error, will just return Promise<null>
var ncPromise = null
async function connectToNats () {
  const wasNotConnected = !ncPromise
  if (wasNotConnected) {
    log.debug(`Connecting to nats: ${JSON.stringify(config.nats.servers)}`)
    ncPromise = connect(connectionOptions)
  }
  try {
    const nc = await ncPromise
    if (wasNotConnected) { // just log thi once
      log.info(`Connected to nats: ${nc.getServer()}`)
    }
  } catch (err) {
    log.error(`error connecting to nats: ${err.message}`)
    ncPromise = null
  }
  return ncPromise
}

async function disconnectFromNats () {
  const nc = await connectToNats()
  if (!nc) {
    log.info('not connected to nats')
    return
  }
  // const done = nc.closed() // use this elsewhere if we needed to be advised of a connection close
  await nc.flush()
  await nc.close()
  log.info('Nats connection closed')
  ncPromise = null
}
