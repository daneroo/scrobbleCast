'use strict'

const tasks = require('./lib/tasks')
const store = require('./lib/store')
const log = require('./lib/log')

// globals
const allCredentials = require('./credentials.json')

main()
async function main () {
  for (let credentials of allCredentials) {
    await tasks.dedup(credentials)
  }
  const dod = await store.db.digestOfDigests()
  // verbose NOT for logcheck
  log.verbose('checkpoint', { digest: dod })
}
