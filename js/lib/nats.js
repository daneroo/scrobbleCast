// Simplest possible nats client just to publish our events

// dependencies - core-public-internal
const {
  connect,
  JSONCodec,
  createInbox,
  RetentionPolicy,
  // Empty,
  consumerOpts
} = require('nats')
// const { ulid } = require('ulid')
const config = require('./config')
const log = require('./log')

exports = module.exports = {
  publish,
  connectToNats,
  disconnectFromNats,
  findOrCreateStream,
  replayMessages,
  scatter,
  scatterIterable,
  delay,
  timeout
}

async function publish (subject, payload = {}) {
  const nc = await connectToNats() // just a resolve if we are connected
  if (!nc) {
    log.warn('Nats connection not available, but will retry on next publish')
    return
  }
  // log.debug(`>> |${subject}|`, JSON.stringify(payload))
  const jc = JSONCodec() // can this object be shared? - recreate every time for now
  nc.publish(
    `im.scrobblecast.scrape.${subject}`,
    jc.encode({
      // id: ulid(),
      stamp: new Date().toISOString(),
      host: config.hostname,
      ...payload
    })
  )
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
// Each publish will initiate the connection, if it is not already open. So `waitOnFirstConnect` option is not required/desired
// We can revisit this when we add subscriber and response handlers
var ncPromise = null
async function connectToNats () {
  const wasNotConnected = !ncPromise
  if (wasNotConnected) {
    log.debug(`Connecting to nats: ${JSON.stringify(config.nats.servers)}`)
    ncPromise = connect(connectionOptions)
  }
  try {
    const nc = await ncPromise
    if (wasNotConnected) {
      // just log thi once
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

// stream stuff
// warn if subjects do not match
// warn if maxAge differs
async function findOrCreateStream (
  streamName,
  subjects,
  maxAge = 86400 * 1e9 // 24h  in nanoseconds
) {
  const nc = await connectToNats()
  if (!nc) {
    // log.warn('Nats connection not available, but will retry on next action')
    return
  } // just a resolve if we are connected

  const jsm = await nc.jetstreamManager()

  // 1-Find the stream
  try {
    const existingStream = await jsm.streams.info(streamName)
    // log.debug('found existing stream', existingStream)

    // check and warn if subjects has changed
    if (
      JSON.stringify(existingStream.config.subjects) !==
      JSON.stringify(subjects)
    ) {
      log.warn('Existing stream: subjects does not match desired:', {
        current: existingStream.config.subjects,
        desired: subjects
      })
    }
    // TODO(daneroo): check retention policy is set to limits
    // check and warn if max_age has changed
    if (existingStream.config.max_age !== maxAge) {
      log.warn('Existing stream: max_age does not match desired:', {
        current: existingStream.config.max_age,
        desired: maxAge
      })
    }
    return existingStream
  } catch (err) {
    if (err.message === 'stream not found') {
      // 2-Create the stream
      const newStream = await jsm.streams.add({
        name: streamName,
        subjects,
        retention: RetentionPolicy.Limits,
        max_age: maxAge
      })
      // log.debug('created new stream', newStream)
      return newStream
    } else {
      log.error('error finding or creating stream', err)
      throw err
    }
  }
}

// This returns an async iterable over JsMsgs
// assumes that the stream state is recent enough to rely on stream.state.messages > 0
// if no message is received in the first emptyTimeoutDeadline. it will return an empty iterable
async function * replayMessages (stream, subject, deltaMS = 0) {
  const emptyTimeoutDeadline = 2e3 // 2 seconds in ms
  const nc = await connectToNats()
  if (!nc) {
    log.warn('Nats connection not available, but will retry on next publish')
    return
  } // just a resolve if we are connected

  // log.debug('stream info', stream)
  try {
    if (stream.state.messages > 0) {
      // create a jetstream client:
      const js = nc.jetstream()

      // create an ephemeral ordered consumer for the stream
      const opts = consumerOpts()
      opts.orderedConsumer()
      opts.ackNone()
      if (deltaMS) {
        opts.startAtTimeDelta(deltaMS)
      }
      // log.debug('opts', opts)

      // now subscribe to a new ephemeral stream
      const sub = await js.subscribe(subject, opts)

      // Guard against the stream being empty with a timeout
      // This will unsubscribe *IFF* the stream is empty, i.e. no first message before timeout deadline
      // The timeout will be cancelled if the stream is not empty
      let to = timeout(emptyTimeoutDeadline)
      to.catch(() => {
        log.debug('replayMessages timeout', { emptyTimeoutDeadline })
        sub.unsubscribe()
      })

      for await (const m of sub) {
        // cancel the unsubscribe on timeout action if we receive a message, i.e. stream is not empty
        if (to) {
          to.cancel()
          to = null // no need to reset the timeout
        }
        yield m

        // terminate the loop if this is the last item in the subscription
        if (m.info.pending === 0) {
          // log.debug('all messages received (pending=0)')
          break
        }
      }
      // log.debug('will sub.destroy()')
      sub.destroy() // this deletes the ephemeral consumer
    } else {
      log.warn('replayMessages: No available messages', {
        stream: stream.config.name,
        subjects: stream.config.subjects
      })
    }
  } catch (err) {
    log.error(`replayMessages error: ${err.message}`, err)
  }
}

// This returns the collection of messages as an array (asychronously)
//  by invoking the iterable below: scatterIterable
async function scatter (subject, payload = {}) {
  const jc = JSONCodec()
  const buf = []

  for await (const m of scatterIterable(subject, payload)) {
    buf.push(jc.decode(m.data))
  }

  return buf
}

// This returns an async iterable over JsMsgs
async function * scatterIterable (subject, payload = {}) {
  const firstTimeoutDeadline = 1e3 // 1 second
  const subsequentTimeoutDeadline = 200 // 200ms
  const nc = await connectToNats()
  if (!nc) {
    log.warn('Nats connection not available, but will retry on next publish')
    return
  } // just a resolve if we are connected

  const jc = JSONCodec()
  const inbox = createInbox(nc.options.inboxPrefix || '')

  const sub = nc.subscribe(inbox)
  await nc.flush()

  nc.publish(subject, jc.encode(payload), { reply: inbox })
  let to = timeout(firstTimeoutDeadline)
  to.catch(() => {
    sub.unsubscribe()
  })
  for await (const m of sub) {
    yield m

    to.cancel()
    to = timeout(subsequentTimeoutDeadline)
    to.catch(() => {
      sub.unsubscribe()
    })
  }
}

function delay (ms) {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve()
    }, ms)
  })
}

// from nats utils (not exported)
function timeout (ms) {
  const err = new Error(`timeout after ${ms}ms`)
  let methods
  let timer
  const p = new Promise((_resolve, reject) => {
    const cancel = () => {
      if (timer) {
        clearTimeout(timer)
      }
    }
    methods = { cancel }
    // @ts-ignore: node is not a number
    timer = setTimeout(() => {
      reject(err)
    }, ms)
  })
  // noinspection JSUnusedAssignment
  return Object.assign(p, methods)
}
