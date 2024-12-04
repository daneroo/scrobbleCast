'use strict'

/*
  Calculate digests per user.
  - digests are usually not qualified per user,
  - this is to manage the deletion of a user
*/

// const tasks = require('./lib/tasks')
const store = require('./lib/store')
const orm = require('./lib/model/orm')
const log = require('./lib/log')
const nats = require('./lib/nats')

// globals
// const allCredentials = require('./credentials.json')
// const Op = orm.Op

main()
async function main() {
  await store.db.init()
  for (const user of [null, 'daniel', 'stephane']) {
    const { digest, elapsed } = await digestTimer(() =>
      digestOfItemDigestsForUser(user)
    )
    log.info('digest:user', { user, scope: 'item', digest, elapsed })
  }
  for (const user of [null, 'daniel', 'stephane']) {
    const { digest, elapsed } = await digestTimer(() =>
      digestOfHistoryDigestsForUser(user)
    )
    log.info('digest:user', { user, scope: 'history', digest, elapsed })
  }

  // same as user=null
  // {
  //   const { digest, elapsed } = await digestTimer(store.db.digestOfDigests)
  //   log.info('checkpoint', { digest, scope: 'item', elapsed })
  // }
  // {
  //   const { digest, elapsed } = await digestTimer(
  //     store.db.digestOfDigestsHistory
  //   )
  //   log.info('checkpoint', { digest, scope: 'history', elapsed })
  // }

  await store.db.end()
  await nats.disconnectFromNats()
}

async function digestTimer(digester) {
  const start = +new Date()
  const digest = await digester()
  const elapsed = (+new Date() - start) / 1000
  return { digest, elapsed }
}

async function digestOfItemDigestsForUser(user) {
  const pageSize = 100000 // tradeoff speed/memory
  const qy = {
    raw: true,
    attributes: ['digest', '__stamp'],
    order: [['__stamp', 'DESC'], 'digest'] // __stamp DESC is causing extra time, even with index
  }
  if (user) {
    qy.where = { __user: user }
  }
  const itemDigester = (item) => item.digest
  return store.db.digester(orm.Item, qy, itemDigester, pageSize)
}

async function digestOfHistoryDigestsForUser(user) {
  const pageSize = 100000 // tradeoff speed/memory
  const qy = {
    raw: true,
    attributes: ['digest'],
    order: ['__user', '__type', 'uuid']
  }
  if (user) {
    qy.where = { __user: user }
  }
  const itemDigester = (item) => item.digest
  return store.db.digester(orm.History, qy, itemDigester, pageSize)
}
