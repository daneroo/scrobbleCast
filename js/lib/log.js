'use strict'

// TODO(daneroo): Exception logging: https://github.com/winstonjs/winston#exceptions
// TODO(daneroo): figure out how to control default level (which is info) from ENV (verbose,debug)

// dependencies - core-public-internal
const winston = require('winston')
require('winston-loggly')
const config = require('./config')

const packageName = 'pocketscrape'

if (config.loggly) { // in case loggly credentials are not available
// default levels: { error: 0, warn: 1, info: 2, verbose: 3, debug: 4, silly: 5 }
  winston.add(winston.transports.Loggly, {
    token: config.loggly.token,
    subdomain: config.loggly.subdomain,
    tags: [packageName, 'host-' + config.hostname],
    json: true
  })
} else {
  console.warn('Loggly disabled')
}

// Remove to add our own..
winston.remove(winston.transports.Console)
winston.add(winston.transports.Console, {
  level: 'debug', // for Console, could depend on ENV ?
  colorize: true, // true, 'all', message or level
  // showLevel: false, // not in console..., but looks weird with only timestamp
  // timestamp: function(){ return 'prefix-or local timestamp'; }
  timestamp: true // logs in UTC
})

// http://tostring.it/2014/06/23/advanced-logging-with-nodejs/
const morganStream = {
  write: function (message /*, encoding */) {
    // trim to remove new line
    winston.info(message.trim())
  }
}
exports = module.exports = {
  log: winston.log, // log(level,...)
  error: winston.error,
  warn: winston.warn,
  info: winston.info,
  verbose: winston.verbose,
  debug: winston.debug,
  morganStream
}
