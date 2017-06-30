'use strict'

// This is meant to exercise the fetch API
// Can use it to test under request error conditions

// dependencies - core-public-internal
const tasks = require('./lib/tasks')
const log = require('./lib/log')

const allCredentials = require('./credentials.json')

main()
async function main () {
  for (let credentials of allCredentials) {
    // await tasks.shallow(credentials)
    await tasks.deep(credentials)
    await tasks.quick(credentials)
    await tasks.dedup(credentials)
  }
  log.info('Done all')
}
