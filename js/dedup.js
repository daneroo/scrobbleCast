'use strict'

const tasks = require('./lib/tasks')
const store = require('./lib/store')
const log = require('./lib/log')
const nats = require('./lib/nats')

// globals
const allCredentials = require('./credentials.json')

main()
async function main() {
  await store.db.init()
  for (const credentials of allCredentials) {
    await tasks.dedupStamp(credentials)
    await tasks.dedup(credentials)
  }

  {
    const { digest, elapsed } = await digestTimer(store.db.digestOfDigests)
    log.info('checkpoint', { digest, scope: 'item', elapsed })
  }
  {
    const { digest, elapsed } = await digestTimer(
      store.db.digestOfDigestsHistory
    )
    log.info('checkpoint', { digest, scope: 'history', elapsed })
  }
  await store.db.end()
  await nats.disconnectFromNats()
}

async function digestTimer(digester) {
  const start = +new Date()
  const digest = await digester()
  const elapsed = (+new Date() - start) / 1000
  return { digest, elapsed }
}
