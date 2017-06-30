'use strict'

// dependencies - core-public-internal
const cron = require('./lib/cron')
const server = require('./lib/server')
const allCredentials = require('./credentials.json')

cron.start(allCredentials)
server.start()

// This was for cron, to prevent from exiting...
// make this process hang around
// closing stdin (^D/EOF) will exit.
process.stdin.resume()
