'use strict'

const tasks = require('./lib/tasks')
const store = require('./lib/store')
const log = require('./lib/log')
const config = require('./lib/config')

// globals
const allCredentials = require('./credentials.json')

main()
async function main () {
  if (process.argv[2] === '--full') { // can also be set with DEDUP_HISTORY_UPSERT=full
    config.dedup.history_upsert = 'full'
  }
  if (config.dedup.history_upsert === 'full') {
    log.verbose('dedup.history_upsert set to full, forcing all history to be updated')
  }
  await require('./lib/model/orm').init()
  for (let credentials of allCredentials) {
    await tasks.dedup(credentials)
  }
  const dod = await store.db.digestOfDigests()
  // verbose NOT for logcheck
  log.verbose('checkpoint', { digest: dod })
}
