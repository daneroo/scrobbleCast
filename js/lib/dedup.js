'use strict'

// Acculumalte delta history per user/__type/uuid
// Also writes the history to db.history
// deduplication is full, but persisting to table is conservative:
// only write (upsert history) if:
//   --lastUpdated is in a time window (24hrs)
//   --podcast uuid is in scrape.spread deep (once every 24hrs)
// You can force full hist table update with
//   DEDUP_HISTORY_UPSERT=full  node dedup.js

// dependencies - core-public-internal
const _ = require('lodash') // only for sortAndSave
const log = require('./log')
const utils = require('./utils')
const config = require('./config')
// -- Implementation functions
const store = require('./store')
const delta = require('./delta')
const orm = require('./model/orm')
const spread = require('./tasks/spread') // for spread.select(stamp,uuid)==deep

// Exported API
exports = module.exports = {
  dedupTask: dedupTask
}

async function dedupTask (credentials) {
  // stamp is used for spread.select===deep
  const stamp = utils.stamp('10minutes')

  let historyForSingleUuid = null
  const user = credentials.name
  var counts = {
    total: 0,
    duplicates: 0,
    keepers: 0
  }

  // to accumulate duplicates
  var duplicates = []

  // to break items on uuid boundaries
  let lastSeen = '' // composite key: {__user, __type, uuid}

  async function itemHandler ({item}) {
    const {__user, __type, uuid} = item
    const seeing = JSON.stringify({__user, __type, uuid})

    // if we have a new episode uuid, flush the old into store
    if (lastSeen !== seeing) {
      lastSeen = seeing
      if (historyForSingleUuid !== null) {
        // insert prev accumulated history into store
        await conditionalUpsertHistory(historyForSingleUuid, stamp)
      }
      historyForSingleUuid = new delta.Accumulator()
    }

    counts.total++

    // Take the merge().length, because is a single Accumualator now.
    // The return signatures are different between Accumulator.merge() and AccumulatorByXX.merge()
    var changeCount = historyForSingleUuid.merge(item).length

    if (changeCount === 0) {
      counts.duplicates++
      duplicates.push(item)
      // log.verbose(`Mark as duplicate: |Δ|:${changeCount} ${JSON.stringify(item)}`);
      // log.verbose(`Mark as duplicate: |Δ|:${changeCount} ${item.__sourceType} ${item.title}`);
    } else {
      counts.keepers++
      // log.verbose(`Mark as keeper:    |Δ|:${changeCount} ${JSON.stringify(item)}`);
      // log.verbose(`Mark as keeper:    |Δ|:${changeCount} ${item.__sourceType} ${item.title}`);
    }
  }

  try {
    await store.db.load({user}, itemHandler)
    log.verbose('Deduped', counts)
    await deleteDuplicates(duplicates)

    // last flush
    await conditionalUpsertHistory(historyForSingleUuid, stamp)

    await sortAndSaveFromDB(user)
  } catch (error) { // TODO: might remove this altogether
    log.error('Dedup', {
      error: error
    })
    throw error
  }
}

// Because upsert history is rather slow (batching could be done as in item.SaveByBatch, but...)
// We will conservatively call upsert only for
// - any history who's h.meta.__lastUpdated is in a recent window from stamp (__lastUpdated>stamp-window)
// - or which responds to the same spread behaviour as scrape (for podcast_uuid)
// - in which case spread.select(stamp, uuid) >=0 guarantees upsert of all items every hour
// - or spread.select(stamp, uuid) >0 guarantees upsert of all items every day
// You can force full hist table update with
//   DEDUP_HISTORY_UPSERT=full  node dedup.js
async function conditionalUpsertHistory (history, stamp) {
  const window = 24 * 3600000 // 86400000 // __lastUpdated in the last 24 hours
  const ago = new Date(stamp).getTime() - new Date(history.meta.__lastUpdated)

  const forceAll = config.dedup.history_upsert === 'full' // default is 'spread'
  const inTimeWindow = ago <= window
  const podcastUuid = (history.meta.__type === 'podcast') ? history.uuid : history.podcast_uuid

  const selected = spread.select(stamp, podcastUuid) === 0 // === deep
  if (!forceAll && !inTimeWindow && !selected) {
    return
  }
  await upsertHistory(history)
}

// TODO:daneroo should move to some class akin to store.*, perhaps history.(mem|db)
async function upsertHistory (history) {
  // log.verbose('saving history', JSON.stringify(history, null, 2))
  const h = {
    __user: history.meta.__user,
    _type: history.meta.__type,
    uuid: history.uuid,
    __firstSeen: history.meta.__firstSeen,
    __lastUpdated: history.meta.__lastUpdated,
    __lastPlayed: history.meta.__lastPlayed,
    history
  }
  try {
    await orm.History.upsert(h)
    // console.log('upsert', ret)
  } catch (error) {
    log.error('history::upsert', error)
  }
}

async function sortAndSaveFromDB (user) {
  const historyByType = new delta.AccumulatorByTypeByUuid()
  const histories = await orm.History.findAll({
    attributes: ['history'],
    where: { __user: user }
  }).map(h => h.history)
  for (const h of histories) {
    delete h.meta.__lastPlayed
    const byUuid = historyByType.getAccumulatorByUuidForType(h.meta.__type)
    const acc = byUuid.getAccumulator(h.uuid)
    // to preserve attribute ordering,..
    delete acc.meta
    delete acc.history
    _.merge(acc, h)
  }
  await historyByType.sortAndSave(user)
}
// TODO: move this into db.removeAll, does batch logic
async function deleteDuplicates (duplicates) {
  // shallow copy of duplicates because batching process is destructive
  duplicates = duplicates.slice()

  const maxBatchSize = 1000
  const start = +new Date()
  log.verbose('deleting %d duplicates', duplicates.length)

  let soFar = 0
  while (duplicates.length > 0) {
    // this removes maxBatchsize elements from duplicates
    const batch = duplicates.splice(0, maxBatchSize)
    const actuallyRemoved = await store.db.removeAll(batch)
    soFar += actuallyRemoved
    const elapsed = (+new Date() - start) / 1000
    const rate = (soFar / elapsed).toFixed(0) + 'r/s'
    log.verbose(` .. deleted duplicates`, { deleted: soFar, remaining: duplicates.length, elapsed: elapsed, rate: rate })
  }
}
