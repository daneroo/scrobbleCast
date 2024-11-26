'use strict'

// const tasks = require('./lib/tasks')
const store = require('./lib/store')
const log = require('./lib/log')
const nats = require('./lib/nats')
const utils = require('./lib/utils')
const orm = require('./lib/model/orm')

// globals
const allCredentials = require('./credentials.json')

main()
async function main() {
  await store.db.init()
  for (const credentials of allCredentials) {
    log.info('scrub', credentials)
    const start = +new Date()
    const counts = await scrubTask(credentials)
    const elapsed = (+new Date() - start) / 1000
    const rate = (counts.total / elapsed).toFixed(0) + 'r/s'
    log.info('scrubbed', { items: counts.total, elapsed, rate })
  }
  await store.db.end()
  await nats.disconnectFromNats()
}

async function scrubTask(credentials) {
  const user = credentials.name
  const start = +new Date()

  // Simulate lifecycle without nats
  log.info(`Task start`, { task: 'scrub', user })

  const counts = {
    total: 0,
    invalidUuid: 0,
    digestMismatch: 0
  }

  const PAGE_SIZE = 10000
  let offset = 0

  // console.log('dedup order', store.db.fieldOrders.dedup)
  while (true) {
    const query = `
      SELECT digest, item 
      FROM items 
      WHERE __user = ? 
      ORDER BY ${store.db.fieldOrders.dedup.join(', ')}
      LIMIT ${PAGE_SIZE} OFFSET ${offset}
    `
    // log.debug('query', { query, offset })

    const items = await orm.sequelize.query(query, {
      replacements: [user],
      type: orm.sequelize.QueryTypes.SELECT
    })

    if (items.length === 0) break

    for (const row of items) {
      counts.total++
      // if (counts.total % 100_000 === 0) {
      //   console.log('Progress:', { counts })
      // }

      const parsedItem = JSON.parse(row.item)
      const validUuid =
        parsedItem.uuid &&
        parsedItem.uuid.length === 36 &&
        /^[0-9a-f-]+$/.test(parsedItem.uuid)

      if (!validUuid) {
        log.warn('invalid uuid', parsedItem.uuid)
        counts.invalidUuid++
      }

      const calculatedDigest = utils.digest(row.item)
      if (row.digest !== calculatedDigest) {
        log.warn('digest mismatch', {
          stored: row.digest,
          calculated: calculatedDigest
        })
        counts.digestMismatch++
      }
    }

    offset += PAGE_SIZE
  }

  const elapsed = ((+new Date() - start) / 1000).toFixed(1)
  log.info(`Task done`, {
    task: 'scrub',
    user,
    ...counts,
    elapsed
  })
  return counts
}
