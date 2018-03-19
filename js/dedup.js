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
  await store.db.init()
  for (let credentials of allCredentials) {
    await tasks.dedup(credentials)
  }

  {
    const {digest, elapsed} = await digestTimer(store.db.digestOfDigests)
    log.info('checkpoint', { digest: digest, scope: 'item', elapsed })
  }
  {
    const {digest, elapsed} = await digestTimer(store.db.digestOfDigestsHistory)
    log.info('checkpoint', { digest: digest, scope: 'history', elapsed })
  }
}

async function digestTimer (digester) {
  const start = +new Date()
  const digest = await digester()
  const elapsed = (+new Date() - start) / 1000
  return {digest, elapsed}
}
