'use strict';

// TODO(daneroo): Exception logging: https://github.com/winstonjs/winston#exceptions
// TODO(daneroo): figure out how to control default level (which is info) from ENV (verbose,debug)

// dependencies - core-public-internal
var winston = require('winston');
require('winston-loggly');
var packageJson = require('../package.json');

// These are the default levels (npm logging levels)
// { error: 0, warn: 1, info: 2, verbose: 3, debug: 4, silly: 5 }
winston.add(winston.transports.Loggly, {
  token: '4b3f4f6a-7074-4d98-ac09-546fab0f07a7',
  subdomain: 'imetrical',
  tags: [packageJson.name],
  json: true
});
// Remove to add our own..
winston.remove(winston.transports.Console);
winston.add(winston.transports.Console, {
  level: 'verbose', // for Console, could depend on ENV ?
  colorize: true, // true, 'all', message or level
  // showLevel: false, // not in console..., but looks weird with timestamp
  timestamp: true // logs in UTC
  // but timestamp can be a string returning function
  // timestamp: function(){ return 'prefix-or local timestamp'; }
});

//  Some tests
// winston.info('Initialized: %s', 'log module', {
//   with: {
//     nested: 'attributes'
//   }
// });
// winston.verbose('This is more verbose');
// winston.profile('test1');
// winston.profile('test2');
// setTimeout(function() {
//   winston.profile('test1','message',{u:'admin'});
// }, 1500);
// setTimeout(function() {
//   winston.profile('test2','message',{u:'watcher'});
// }, 1000);

exports = module.exports = {
  log: winston.log, // log(level,...)
  error: winston.error,
  warn: winston.warn,
  info: winston.info,
  verbose: winston.verbose,
  debug: winston.debug
};
