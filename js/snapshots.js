'use strict'

// This utility will read everything from store.db
// and produces snapshot files.
// The snapshots are aggregated by user/month
// the last (incomplete) month is flushed to 'current'
//   snapshots/monthly/<user>/monthly-<user>-<month>.jsonl
//   snapshots/current/<user>/current-<host>.<user>.jsonl

// TODO(daneroo): maybe ...
// - make file writing async
// - optional gzipping
// - externalize dedup verification...

// dependencies - core-public-internal
var config = require('./lib/config')
var log = require('./lib/log')
var sinkFile = require('./lib/sink/file')
var delta = require('./lib/delta')
var store = require('./lib/store')

// globals
var allCredentials = require('./credentials.json')

const basepath = ['data/snapshots/']

main()

async function main () {
  try {
    for (const credentials of allCredentials) {
      log.info('Snapshots started', { user: credentials.name })
      await snapshotForUser(credentials)
    }
  } catch (err) {
    log.error('error', err)
  }

  await store.db.end()
}

async function snapshotForUser (credentials) {
  const writerCtx = newWriterCtx() //

  const user = credentials.name

  // use special order to match file writing..
  await store.db.load({ user, order: store.db.fieldOrders.snapshot }, writerCtx.handler)

  await writerCtx.flush() // ok, cause it's synchronous (for now)
  log.verbose('snapshot:counts', {
    user,
    items: writerCtx.count()
  })
}

// return an object with these functions: {
//   handler: item handler for store.db.load
//   historyByType: accumulated stae for deduping on the fly
//   flush: function for writing the last pendin month
// The handler
// - reports item progress (moved to write logging)
// - validates increasing stamp order
// - acccumulates items in an {type:[items]} which is passed in.
// - writes out any completed months

function newWriterCtx () {
  // throw error if item.__stamp's are non-increasing
  let maxStamp = '1970-01-01T00:00:00Z' // to track increasing'ness

  function checkStampOrdering (item) {
    var stamp = item.__stamp
    if (stamp < maxStamp) {
      log.verbose('Item stamp not increasing', {
        maxStamp: maxStamp,
        item: item
      })
      throw new Error('Item stamp not increasing')
    }
    maxStamp = stamp
  }

  let singleUser // used to validate that all items have same user
  // validates that we are always called with a single user, throws on violation
  function checkUser (item) {
    // validate that all items are for same user
    if (!singleUser) {
      singleUser = item.__user
    } else if (singleUser !== item.__user) {
      var msg = 'Mixing users in loader'
      log.error(msg, {
        expected: singleUser,
        found: item.__user
      })
      throw new Error(msg)
    }
  }

  var historyByType = new delta.AccumulatorByTypeByUuid()
  // Validate that source was properly deduped, and enable history checksum
  function checkForDedup (item) {
    var changeCount = historyByType.merge(item)
    if (changeCount === 0) {
      log.verbose('Item not deduped', {
        changeCount: changeCount,
        item: item
      })
      var msg = `* Item Not deduped: ${changeCount} ${item}`
      throw new Error(msg)
    }
  }

  // accumulate items by month, and write out
  // since we are not writing the last month, it is not a problem,
  // that the last accumulated month will never be written out
  var previousMonth = null // stamp for current month
  var itemsForMonth = []

  function writeByMonth (item) {
    var __stamp = new Date(Date.parse(item.__stamp))
    // find begining of month (UTC)
    var month = new Date(Date.UTC(__stamp.getUTCFullYear(), __stamp.getUTCMonth())).toJSON()
    // iso8601, remove millis
    month = month.replace(/\.\d{3}Z$/, 'Z')

    var shouldWrite = previousMonth !== null && month !== previousMonth
    if (shouldWrite) {
      // actually write out the month: all types;
      var _user = item.__user
      var suffix = 'jsonl'

      // TODO(daneroo) make async
      var outfile = `${basepath}/monthly/${_user}/monthly-${_user}-${previousMonth}.${suffix}`
      sinkFile.write(outfile, itemsForMonth, {
        overwrite: false,
        log: true
      })
      itemsForMonth = []
    }
    itemsForMonth.push(item)
    previousMonth = month
  }

  // TODO(daneroo) make async
  function flush () {
    // items is the result of the pg-load being passed through the promise chain
    const remaining = itemsForMonth
    log.verbose('Snapshot:flush', { remaining: remaining.length })
    if (remaining.length > 0) {
      var _user = remaining[0].__user
      var suffix = 'jsonl'
      var hostname = config.hostname

      // TODO(daneroo) make async
      var outfile = `${basepath}/current/${_user}/current-${hostname}.${_user}.${suffix}`
      sinkFile.write(outfile, itemsForMonth, {
        overwrite: true,
        log: true
      })
      itemsForMonth = []
    }
  }

  let itemCount = 0
  // the actual itemHandler being returned
  async function handler ({ item }) {
    // console.log('..stamp',stamp);
    // throw error if item.__stamp's are non-increasing
    checkStampOrdering(item)
    // check that we are always called with same user
    checkUser(item)

    checkForDedup(item)

    // buffered - write
    writeByMonth(item)
    itemCount++
  }

  return {
    handler,
    historyByType,
    flush,
    count: () => itemCount
  }
}
