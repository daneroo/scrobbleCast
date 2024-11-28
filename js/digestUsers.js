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
const Op = orm.Op

main()
async function main() {
  await store.db.init()
  for (const user of [null, 'daniel', 'stephane']) {
    const { digest, elapsed } = await digestTimer(() =>
      digestOfDigestsForUser(user)
    )
    log.info('digest:user', { digest, scope: 'item', user, elapsed })
  }
  {
    const { digest, elapsed } = await digestTimer(store.db.digestOfDigests)
    log.info('checkpoint', { digest, scope: 'item', elapsed })
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

async function digestOfDigestsForUser(user) {
  const pageSize = 100000 // tradeoff speed/memory
  const qy = digestsQyForUser({ user })
  const itemDigester = (item) => item.digest
  return store.db.digester(orm.Item, qy, itemDigester, pageSize)
}

function digestsQyForUser({
  user,
  since = '1970-01-01T00:00:00Z',
  before = '2040-01-01T00:00:00Z'
} = {}) {
  const qy = {
    raw: true,
    attributes: ['digest', '__stamp'],
    where: {
      __stamp: {
        [Op.gte]: since, // >= since (inclusive)
        [Op.lt]: before // < before (strict)
      }
    },
    order: [['__stamp', 'DESC'], 'digest'] // __stamp DESC is causing extra time, even with index
  }
  if (user) {
    qy.where.__user = user
  }
  return qy
}
