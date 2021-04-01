'use strict'

// Accumulate delta history per user/__type/uuid
// Also writes the history to db.history
// deduplication is full, but persisting to table is conservative:
// only write (upsert history) if:
//   --lastUpdated is in a time window (24hrs)
//   --podcast uuid is in scrape.spread deep (once every 24hrs)

// dependencies - core-public-internal
const log = require('./log')
const utils = require('./utils')
// -- Implementation functions
const store = require('./store')
const delta = require('./delta')
const orm = require('./model/orm')
const Op = orm.Op

// Exported API
exports = module.exports = {
  dedupTask,
  upsertHistories,
  deleteDuplicates
}

async function dedupTask (credentials) {
  // stamp is used for spread.select===deep
  const stamp = utils.stamp('10minutes')

  let historyForSingleUuid = null
  const user = credentials.name
  var counts = {
    total: 0,
    duplicates: 0,
    keepers: 0,
    insertH: 0, // history inserts
    updateH: 0 // history upserts
  }

  // to accumulate duplicates
  const duplicates = []
  const historyBatchSize = 1000
  const historiesToUpsert = [] // batch them up

  // to break items on uuid boundaries
  let lastSeen = '' // composite key: {__user, __type, uuid}

  async function itemHandler ({ item }) {
    const { __user, __type, uuid } = item
    const seeing = JSON.stringify({ __user, __type, uuid })

    // if we have a new episode uuid, flush the old into store
    if (lastSeen !== seeing) {
      lastSeen = seeing
      if (historyForSingleUuid !== null) {
        // insert prev accumulated history into store
        historiesToUpsert.push(historyForSingleUuid)

        if (historiesToUpsert.length >= historyBatchSize) {
          const batchCounts = await batchUpsertHistory(historiesToUpsert, stamp)
          counts.insertH += batchCounts.insert
          counts.updateH += batchCounts.update
          historiesToUpsert.length = 0 // empty
        }
      }
      historyForSingleUuid = new delta.Accumulator()
    }

    counts.total++

    // Take the merge().length, because is a single Accumualator now.
    // The return signatures are different between Accumulator.merge() and AccumulatorByXX.merge()
    const changeCount = historyForSingleUuid.merge(item).length

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
    await store.db.loadByRangeWithDeadline({ user }, itemHandler)

    // last flush of Accumulator
    historiesToUpsert.push(historyForSingleUuid)
    // last flush of historyBatch
    const batchCounts = await batchUpsertHistory(historiesToUpsert, stamp)
    counts.insertH += batchCounts.insert
    counts.updateH += batchCounts.update
    historiesToUpsert.length = 0 // empty

    await deleteDuplicates(duplicates)

    return counts
  } catch (error) { // TODO: might remove this altogether
    log.error('Dedup', {
      error: error
    })
    throw error
  }
}

function _digest (item) {
  return utils.digest(JSON.stringify(item))
}

async function _filterExisting (Model, wrappedItemsWithDigests) {
  const digests = wrappedItemsWithDigests.map(i => i.digest)

  const existingDigests = await Model.findAll({
    raw: true,
    attributes: ['digest'],
    where: {
      digest: {
        [Op.in]: digests
      }
    }
  }).map(i => i.digest)
  // if no existing digests, return original array
  if (existingDigests.length === 0) {
    return wrappedItemsWithDigests
  }
  // console.log('existing digests', existingDigests.length)

  // make a lookup for filtering
  const exists = {}
  existingDigests.forEach(digest => {
    exists[digest] = true
  })

  const filtered = wrappedItemsWithDigests.filter(item => !exists[item.digest])

  return filtered
}

async function batchUpsertHistory (histories, stamp) {
  // remove existing
  const wrapped = histories.map(h => ({ history: h, digest: _digest(h) }))
  const needSaving = await _filterExisting(orm.History, wrapped)

  const counts = await upsertHistories(needSaving.map(h => h.history))
  return counts
}

// TODO:daneroo should move to some class akin to store.*, perhaps history.(mem|db)
async function upsertHistories (histories) {
  const counts = { insert: 0, update: 0 }
  if (histories.length === 0) {
    return counts
  }
  const bulkInserts = []
  for (const history of histories) {
    const key = {
      __user: history.meta.__user,
      __type: history.meta.__type,
      uuid: history.uuid
    }
    const digest = utils.digest(JSON.stringify(history))
    const dbDigest = await orm.History.findOne({
      raw: true,
      attributes: ['digest'],
      where: key
    })
    // duplicate means history is present and matches digest
    const duplicate = dbDigest && (dbDigest.digest === digest)
    if (duplicate) {
      continue
    }
    try {
      if (dbDigest) { // and not duplicate
        counts.update++
        await orm.History.upsert({ ...key, history })
      } else {
        // await orm.History.create({...key, history})
        bulkInserts.push({ ...key, history })
      }
    } catch (error) {
      log.error('history::upsert', error)
    }
  }
  try {
    counts.insert += bulkInserts.length
    await orm.History.bulkCreate(bulkInserts)
  } catch (error) {
    log.error('history::bulkCreate', error)
  }
  return counts
}

// TODO: move this into db.removeAll, does batch logic
async function deleteDuplicates (duplicates) {
  if (duplicates.length === 0) {
    return
  }
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
    log.verbose(' .. deleted duplicates', { deleted: soFar, remaining: duplicates.length, elapsed: elapsed, rate: rate })
  }
}
