'use strict'

// dependencies - core-public-internal
const config = require('./lib/config')
const log = require('./lib/log')
const nats = require('./lib/nats')
const cron = require('./lib/cron')
const server = require('./lib/server')
const store = require('./lib/store')
const allCredentials = require('./credentials.json')

log.info('Version', config.version)
log.info('Starting server', {
  hostname: config.hostname,
  dialect: config.sequelize.settings.dialect,
  peers: config.peers
})
nats.connectToNats()
cron.start(allCredentials)
server.start()

// This was for cron, to prevent from exiting...
// make this process hang around
// closing stdin (^D/EOF) will exit.
process.stdin.resume()

// Graceful shutdown
// see https://snyk.io/blog/10-best-practices-to-containerize-nodejs-web-applications-with-docker/
async function closeGracefully(signal) {
  log.info(`Received signal to terminate: ${signal}`)

  await Promise.all([
    nats.disconnectFromNats(),
    store.db.end()
    // cron.stop ?
    // express.close ?
  ])
  process.exit()
}
process.on('SIGINT', closeGracefully)
process.on('SIGTERM', closeGracefully)
