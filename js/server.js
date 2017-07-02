'use strict'

// dependencies - core-public-internal
const config = require('./lib/config')
const log = require('./lib/log')
const cron = require('./lib/cron')
const server = require('./lib/server')
const allCredentials = require('./credentials.json')

log.info('Started server', {hostname: config.hostname, dialect: config.sequelize.settings.dialect})
cron.start(allCredentials)
server.start()

// This was for cron, to prevent from exiting...
// make this process hang around
// closing stdin (^D/EOF) will exit.
process.stdin.resume()
