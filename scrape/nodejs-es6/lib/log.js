'use strict';

// TODO(daneroo): Exception logging: https://github.com/winstonjs/winston#exceptions
// TODO(daneroo): figure out how to control default level (which is info) from ENV (verbose,debug)

// dependencies - core-public-internal
var os = require('os');
var fs = require('fs');
var winston = require('winston');
require('winston-loggly');
var packageJson = require('../package.json');
var config = JSON.parse(fs.readFileSync('credentials.loggly.json').toString());

var hostname = os.hostname();

// default levels: { error: 0, warn: 1, info: 2, verbose: 3, debug: 4, silly: 5 }
winston.add(winston.transports.Loggly, {
  token: config.token,
  subdomain: config.subdomain,
  tags: [packageJson.name, 'host-' + hostname],
  json: true
});

// Remove to add our own..
winston.remove(winston.transports.Console);
winston.add(winston.transports.Console, {
  level: 'verbose', // for Console, could depend on ENV ?
  colorize: true, // true, 'all', message or level
  // showLevel: false, // not in console..., but looks weird with only timestamp
  // timestamp: function(){ return 'prefix-or local timestamp'; }
  timestamp: true // logs in UTC
});

exports = module.exports = {
  log: winston.log, // log(level,...)
  error: winston.error,
  warn: winston.warn,
  info: winston.info,
  verbose: winston.verbose,
  debug: winston.debug
};
