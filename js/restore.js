'use strict'

// This utility will read all source snapshots
//  (which includes monthly, and current (last monthly partial),
// and restores them into store.db

// dependencies - core-public-internal
const log = require('./lib/log')
const delta = require('./lib/delta')
const store = require('./lib/store')

// globals
const allCredentials = require('./credentials.json') // .slice(0, 1);

// const basepaths = ['snapshots'];
const basepaths = ['snapshots/monthly', 'snapshots/current']

main()

async function main () {
  try {
    await store.db.init()

    for (const credentials of allCredentials) {
      log.info('Restore started', { user: credentials.name })
      await restore(credentials)
      await accumulateItems(credentials)
    }
  } catch (err) {
    log.error('error', err)
  }

  await digestOfDigests()

  await store.db.end()
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

  await store.file.load(loadOpts, saver)
  await saver.flush()
}

async function digestOfDigests () {
  const dod = await store.db.digestOfDigests()
  // verbose NOT for logcheck
  log.verbose('checkpoint', { digest: dod })
}

async function accumulateItems (credentials) {
  const user = credentials.name
  const historyByType = new delta.AccumulatorByTypeByUuid()
  const mergedItemCount = 0

  async function itemHandler ({ item }) {
    const changeCount = historyByType.merge(item)
    if (changeCount === 0) {
      // throw new Error(`Item Not deduped: |Δ|:${changeCount} ${JSON.stringify(item)}`);
      log.verbose(`Item Not deduped: |Δ|:${changeCount}  ${item.__sourceType} ${item.title}`)
    }
  }

  await store.db.load({ user }, itemHandler)
  log.verbose('restore:counts', {
    user,
    merged: mergedItemCount
  })
}
