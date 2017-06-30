'use strict'

// This utility will read all source snapshots
//  (which includes monthly, and current (last monthly partial),
// and restores them into store.db

// dependencies - core-public-internal
var log = require('./lib/log')
var delta = require('./lib/delta')
var store = require('./lib/store')
var utils = require('./lib/utils')

// globals
var allCredentials = require('./credentials.json') // .slice(0, 1);

// const basepaths = ['snapshots'];
const basepaths = ['snapshots/monthly', 'snapshots/current']

main()

async function main () {
  try {
    await store.db.init()

    for (let credentials of allCredentials) {
      log.info('Restore started', { user: credentials.name })
      await restore(credentials)
      await accumulateItems(credentials)
    }
  } catch (err) {
    log.error('error', err)
  }

  await digestOfDigests()

  log.debug('Closing connection')
  await store.db.end()
  log.debug('Closed connection')

    // seems to hang with sequelize for postgres
  process.exit(0)
}

async function restore (credentials) {
  // const saver = store.db.save;
  // TODO(daneroo) batchSaver(.flush) move to pg
  const batchSize = 1000 // which is the default

  const loadOpts = {
    prefix: basepaths,
    assert: {
      // stampOrder: true,
      // singleUser: true,
      progress: true // should not be an assertion.
    },
    filter: {
      __user: credentials.name
    }
  }
  const saver = store.db.saveByBatch(batchSize)

  await store.impl.file.load(loadOpts, saver)
  await saver.flush()
}

async function digestOfDigests () {
  const digests = await store.db.digests()
  const dod = utils.digest(JSON.stringify(digests), 'sha256', true)
  log.info('Digest of digests', { items: digests.length, digest: dod })
}

async function accumulateItems (credentials) {
  const __user = credentials.name
  const historyByType = new delta.AccumulatorByTypeByUuid()

  log.debug('accumulateItems', { user: __user })

  const opts = { filter: { __user: __user } }

  async function itemHandler (item) {
    var changeCount = historyByType.merge(item)
    if (changeCount === 0) {
      // throw new Error(`Item Not deduped: |Δ|:${changeCount} ${JSON.stringify(item)}`);
      log.verbose(`Item Not deduped: |Δ|:${changeCount}  ${item.__sourceType} ${item.title}`)
    }
    return true
  }

  const results = await store.db.load(opts, itemHandler)
  log.verbose('Merged', results.length)
  historyByType.sortAndSave(__user)
}
