'use strict'

// Copied/Moved to logcheck.js

// dependencies - core-public-internal
const log = require('./lib/log')
const nats = require('./lib/nats')

const { JSONCodec, headers, nuid } = require('nats')

main()
async function main () {
  const peerId = nuid.next()
  log.info(`Peer discovery - client - ${peerId}`)

  const subject = 'im.scrobblecast.scrape.discovery'
  const payload = { peerId }
  const h = headers()
  h.append('peerId', peerId)

  try {
    const nc = await nats.connectToNats() // just a resolve if we are connected

    const jc = JSONCodec()

    const sub = nc.subscribe(subject)

    for await (const m of sub) {
      // incoming headers: m.headers
      if (m.headers) {
        for (const [key, value] of m.headers) {
          console.log(`H: ${key}=${value}`)
        }
        // reading/setting a header is not case sensitive
        console.log('peerId', m.headers.get('peerId'))
      }

      if (m.respond(jc.encode(payload), { headers: h })) {
        console.log(
          `[#${sub.getProcessed()}]: ${m.reply}: ${JSON.stringify(
            jc.decode(m.data)
          )}`
        )
      } else {
        console.log(`[${sub.getProcessed()}]: ignored - no reply subject`)
      }
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

// function delay (ms) {
//   return new Promise((resolve) => {
//     setTimeout(() => {
//       resolve()
//     }, ms)
//   })
// }
