'use strict'

/*
 - to check for digest mismatches, i.e. digest(item json) !== digest
 - to check for invalid uuids, i.e. uuid.length !== 36 || !/^[0-9a-f-]+$/.test(uuid)
 - to check for invalid __user and __type in histories
 - to check for orphaned histories, i.e. history.uuid not found in items

 Why?
 Taking snapshots on 2024-11-24, while synch'ing to S3, it became apparent that
a single (monthly) file had a discrepancy between hosts, furthermore, 
digest field matched the digest of the correct json, 
which means the json alone was corrupted,
but after it was digested, either in memory or in the database file itself.

So we made this script to scrub the database for known corruption.

**Note:** It could be enhanced to validate an entire schema.
This was also started in the parallel project: `../scrub/`

darwin-monthly-daniel-2023-05-01:line-1201:
  "uuid": "f13e�4d1-cf81-4bd6-b4d5-55f314e580fc",
  bad char ....^
dirac-monthly-daniel-2023-05-01:line-1201: 
  "uuid": "f13e84d1-cf81-4bd6-b4d5-55f314e580fc",

  Or a live proof from the database
  $ sqlite3 data/sqlite/scrobblecast-darwin-corrupted-uuid-2024-11-24.sqlite  "SELECT item FROM items WHERE digest = '06073ce9a43119ee3bc046b792ea4542cf357839555f3ae745832a0b950f8e47';" | jq .uuid
  "f13e�4d1-cf81-4bd6-b4d5-55f314e580fc"

  $ sqlite3 data/sqlite/scrobblecast-dirac-2024-11-24.sqlite  "SELECT item FROM items WHERE digest = '06073ce9a43119ee3bc046b792ea4542cf357839555f3ae745832a0b950f8e47';" | jq .uuid
  "f13e84d1-cf81-4bd6-b4d5-55f314e580fc"

  The fix was to
  sqlite3 data/sqlite/scrobblecast.sqlite   "DELETE FROM items WHERE digest = '06073ce9a43119ee3bc046b792ea4542cf357839555f3ae745832a0b950f8e47';"
  and then re-run the sync with uncorrupted machine dirac.
  $ node sync.js http://dirac.imetrical.com:8000/api 2023-05-01
 */

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

  // Run global checks first
  await scrubGlobalTask()

  // Then check items and histories per user
  for (const credentials of allCredentials) {
    await scrubItemsTask(credentials)
    await scrubHistoriesTask(credentials)
  }
  await store.db.end()
  await nats.disconnectFromNats()
}

async function scrubGlobalTask() {
  const start = +new Date()
  log.info(`Task start`, { task: 'scrub', scope: 'global' })

  const counts = {
    total: 0,
    orphanedHistory: 0
  }

  // Find orphaned histories: entries in the histories table
  // that have no corresponding entry in items table
  // matching on all three keys: __user, __type, and uuid
  const query = `
    SELECT h.__user, h.__type, h.uuid
    FROM histories h
    LEFT JOIN items i ON 
        h.__user = i.__user AND 
        h.__type = i.__type AND 
        h.uuid = i.uuid
    WHERE i.__user IS NULL
    ORDER BY h.__user, h.__type, h.uuid
  `

  const issues = await orm.sequelize.query(query, {
    type: orm.sequelize.QueryTypes.SELECT
  })

  for (const row of issues) {
    counts.total++
    log.warn('orphaned history', {
      user: row.__user,
      type: row.__type,
      uuid: row.uuid
    })
    counts.orphanedHistory++
  }

  const elapsed = ((+new Date() - start) / 1000).toFixed(1)
  log.info(`Task done`, {
    task: 'scrub',
    scope: 'global',
    ...counts,
    elapsed
  })
  return counts
}

async function scrubItemsTask(credentials) {
  const user = credentials.name
  const start = +new Date()

  log.info(`Task start`, { task: 'scrubItems', user })

  const counts = {
    total: 0,
    invalidUuid: 0,
    digestMismatch: 0
  }

  const PAGE_SIZE = 10000
  let offset = 0

  // console.log('dedup order', store.db.fieldOrders.dedup)
  while (true) {
    // log.debug(`Items page`, { offset })

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
  const rate = (counts.total / elapsed).toFixed(0) + 'r/s'

  log.info(`Task done`, {
    task: 'scrubItems',
    user,
    ...counts,
    elapsed,
    rate
  })
  return counts
}

async function scrubHistoriesTask(credentials) {
  const user = credentials.name
  const start = +new Date()
  const PAGE_SIZE = 1000

  log.info(`Task start`, { task: 'scrubHistories', user })

  const counts = {
    total: 0,
    invalidUuid: 0,
    digestMismatch: 0
  }

  let lastDigest = '0'
  while (true) {
    const query = `
      SELECT digest, history, uuid 
      FROM histories 
      WHERE __user = ? 
        AND digest > ?
      ORDER BY digest ASC
      LIMIT ${PAGE_SIZE}
    `

    const histories = await orm.sequelize.query(query, {
      replacements: [user, lastDigest],
      type: orm.sequelize.QueryTypes.SELECT
    })

    if (histories.length === 0) break

    // log.debug('Histories page', { lastDigest, count: histories.length })

    for (const row of histories) {
      counts.total++

      // Check UUID format
      const uuid = row.uuid
      if (uuid.length !== 36 || !/^[0-9a-f-]+$/.test(uuid)) {
        log.warn('invalid uuid', { user, uuid })
        counts.invalidUuid++
      }

      // Validate digest matches history JSON content
      const calculatedDigest = utils.digest(row.history)
      if (calculatedDigest !== row.digest) {
        log.warn('digest mismatch', {
          user,
          uuid: row.uuid,
          stored: row.digest,
          calculated: calculatedDigest
        })
        counts.digestMismatch++
      }

      lastDigest = row.digest
    }
  }

  const elapsed = ((+new Date() - start) / 1000).toFixed(1)
  log.info(`Task done`, {
    task: 'scrubHistories',
    user,
    ...counts,
    elapsed,
    rate: Math.round(counts.total / elapsed) + 'r/s'
  })
  return counts
}
