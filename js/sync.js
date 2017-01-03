'use strict';

// This utility will read all source files: extra=''
// and dunp them into postgres
// Object keys: user/type/uuid/stamp/

// dependencies - core-public-internal
var log = require('./lib/log');
var sync = require('./lib/sync');
var store = require('./lib/store');
var utils = require('./lib/utils');

// globals
const baseURI = (process.argv.length > 2) ? process.argv[2] : 'http://euler:8000/api'

// *** Adjust params as needed, default is ALL TIME
function syncAll() {
  const syncParams = {
    // since: utils.ago(1 * 24 * 3600),
    // before: utils.stamp('10minutes')
  }
  return sync.sync(baseURI, syncParams)
}

Promise.resolve(true)
  // Promise.reject(new Error('Abort now!'))
  .then(store.impl.pg.init)
  .then(syncAll)
  .catch(verboseErrorHandler(false))
  // this used to be a finally clause - for which there is a polyfill: https://www.promisejs.org/api/
  .then(function () {
    log.debug('OK: Done, done, releasing PG connection');
    store.impl.pg.end();
  }, function (err) {
    log.debug('ERR: Done, done, releasing PG connection', err);
    store.impl.pg.end();
  });

// ************ Utilities

//TODO(daneroo): move to log.debugging module (as Factory?)
function verboseErrorHandler(shouldRethrow) {
  return function errorHandler(error) {
    log.error('error', error);
    if (shouldRethrow) {
      throw (error);
    }
  };
}
