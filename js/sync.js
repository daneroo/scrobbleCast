'use strict'

// This utility will read all source files: extra=''
// and dunp them into postgres
// Object keys: user/type/uuid/stamp/

// dependencies - core-public-internal
const nats = require('./lib/nats')
const log = require('./lib/log')
const sync = require('./lib/sync')
const store = require('./lib/store')

// globals
const baseURI =
  process.argv.length > 2
    ? process.argv[2]
    : 'http://dirac.imetrical.com:8000/api'

const since = process.argv.length > 3 ? process.argv[3] : null

// *** Adjust params as needed, default is ALL TIME
function syncAll() {
  const syncParams = {
    // since: utils.ago(1 * 24 * 3600),
    // before: utils.stamp('10minutes')
  }
  if (since) {
    syncParams.since = since
  }
  return sync.sync(baseURI, syncParams)
}

Promise.resolve(true)
  // Promise.reject(new Error('Abort now!'))
  .then(store.db.init)
  .then(syncAll)
  .catch(verboseErrorHandler(false))
  // this used to be a finally clause - for which there is a polyfill: https://www.promisejs.org/api/
  .then(
    async function () {
      log.debug('OK: Done, done, releasing PG connection')
      await store.db.end()
      await nats.disconnectFromNats()
    },
    async function (err) {
      log.debug('ERR: Done, done, releasing PG connection', err)
      await store.db.end()
      await nats.disconnectFromNats()
    }
  )

// ************ Utilities

// TODO(daneroo): move to log.debugging module (as Factory?)
function verboseErrorHandler(shouldRethrow) {
  return function errorHandler(error) {
    log.error('error', error)
    if (shouldRethrow) {
      throw error
    }
  }
}
