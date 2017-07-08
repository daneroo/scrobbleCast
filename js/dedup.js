'use strict'

var tasks = require('./lib/tasks')
var store = require('./lib/store')
var log = require('./lib/log')

// globals
var allCredentials = require('./credentials.json')

main()
async function main () {
  for (let credentials of allCredentials) {
    await tasks.dedup(credentials)
  }
  const dod = await store.db.digestOfDigests()
  log.info('checkpoint', { digest: dod })
}
