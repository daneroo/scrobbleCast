'use strict'

// Acculumalte delta history per user, over <data>/byUserStamp
// remove null change files (<data>/dedup/byUserStamp)
// copy original file (when delta>0) to <data>/noredux/byUserStamp
// overwrite minimal changeset to <data>/byUserStamp

// dependencies - core-public-internal
var log = require('./log')
var Promise = require('bluebird')
// -- Implementation functions
var store = require('./store')
var delta = require('./delta')

// Exported API
exports = module.exports = {
  dedupTask: dedupTask
}

function dedupTask (credentials) {
  var historyByType = new delta.AccumulatorByTypeByUuid()
  var __user = credentials.name
  return Promise.resolve(true)
    .then(function () {
      const opts = {
        filter: {
          __user: __user
        }
      }

      var counts = {
        total: 0,
        duplicates: 0,
        keepers: 0
      }
      var duplicates = []
      function itemHandler (item) {
        counts.total++
        var changeCount = historyByType.merge(item)

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
        return Promise.resolve(true)
      }

      return store.db.load(opts, itemHandler)
        .then((/* items */) => {
          log.verbose('Deduped', counts)
          return deleteDuplicates(duplicates)
        })
    })
    .then(() => {
      historyByType.sortAndSave(__user)
      return true
    })
    .catch(function (error) { // TODO: might remove this altogether
      log.error('Dedup ', {
        error: error
      })
      throw error
    })
}

// move this into db.removeAll, does batch logic
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
