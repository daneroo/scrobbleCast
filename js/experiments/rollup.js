'use strict'

// This utility will read all source files: extra=''
// and 'rollup' into Month files: with stamps up to (strict <) begining of month
//  -optional jsonl
//  -optional gzipping
//  -optional partial signature? in content
//  -optional content addressable filename (include md5 sig)
//  -verify sorted (stamp)
//  -verify deduped
// verify or write new required rollups

// dependencies - core-public-internal
var util = require('util')
var Promise = require('bluebird')
var log = require('./lib/log')

var srcFile = require('./lib/source/file')
var sinkFile = require('./lib/sink/file')
var delta = require('./lib/delta')

// globals
var allCredentials = require('./credentials.json')

Promise.resolve(true)
  .then(main)
  .then(logMemAfterGC)
  .catch(verboseErrorHandler(false))

// TODO: The eventual flow should be
// -loadItems from extra=''
//  perform dedup checking as we go, removing the need for accumulating all Items, only currentMonth
// at the end validate that history with/without rollup is identical
function main () {
  var extra = ''
  // var extra = 'rollup'; // to switch to rollup..
  return Promise.each(allCredentials, function (credentials) {
    logMemAfterGC()
    log.info('Rollup started', {
      user: credentials.name
    })
    return rollup(credentials, extra)
  })
}

function rollup (credentials, extra) {
  // blank out accumulators
  return loadItems(credentials, extra)
}

// returns all items from extra, in an array
function loadItems (credentials, extra) {
  // shared handler for both extras
  var l = loader()
  var sharedHandler = l.handler
  var historyByType = l.historyByType

  function reportCounts (counts) {
    Object.keys(counts).forEach(function (name) {
      var maxStamp = l.getMaxStamp()
      // var msg = util.format('base:%s user:%s |stamps|:%s |f|:%s |p|:%s |ignored|:%s max(stamp):%s', extra, name, c.stamp, c.file, c.part, c.ignoredFiles, maxStamp);
      log.verbose('Rollup:counts', {
        base: extra,
        user: name,
        counts: counts,
        maxStamp: maxStamp
      })
    })
    return Promise.resolve(true)
  }

  // TODO: clean this up for final logic, with opts
  // this is the double iteration loader
  return srcFile.iterator(extra, [credentials], sharedHandler, '**/*.json?(l)')
    .then(reportCounts)
    .then(function () {
      // get and fix the stamp lowerbound
      var maxStamp = l.getMaxStamp()

      if (extra === 'rollup') {
        log.verbose('Reading rest of entries from default', {
          after: maxStamp
        })
      } else {
        log.debug('NOT Reading rest of entries from default')
        return Promise.resolve(true)
      }

      function skippingFilter (credentials, stamp /*, file , item */) {
        return (stamp > maxStamp)
      }

      // now call with extra=''
      return srcFile.iterator('', [credentials], sharedHandler, '**/*.json?(l)', skippingFilter)
        .then(reportCounts)
    })
    // return srcFile.iteratorWithRollup(extra, [credentials], sharedHandler, '**/*.json?(l)')
    .then(function () {
      var _user = credentials.name
      historyByType.sortAndSave(_user)
      return Promise.resolve(true)
    })
}

// return an item handler for srcFile.iterator which:
// - reports item progress (moved to write logging)
// - validates increasing stamp order
// - acccumulates items in an {type:[items]} which is passed in.
// - writes out any completed months
function loader () {
  // throw error if item.__stamp's are non-increasing
  var maxStamp = '1970-01-01T00:00:00Z' // to track increasing'ness
  function getMaxStamp () {
    return maxStamp
  }

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

  var singleUser // used to validate that all items have same user
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
      var msg = util.format('* Item Not deduped: %s %j', changeCount, item)
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

      // TODO replace data/ with sink.dataDirName
      var outfile = util.format('data/rollup/byUserStamp/%s/%s/monthly-%s.%s', _user, previousMonth, previousMonth, suffix)
      sinkFile.write(outfile, itemsForMonth, {
        // TODO overwrite should be false, causing errors!
        // TODO Write verification needs to account for .jsonl
        overwrite: false,
        log: true
      })
      itemsForMonth = []
    }
    itemsForMonth.push(item)
    previousMonth = month
  }

  // the actual itemHandler being returned
  var handler = function itemHandler (credentials, stamp, file, item) {
    // throw error if item.__stamp's are non-increasing
    checkStampOrdering(item)
    // check that we are always called with same user
    checkUser(item)

    checkForDedup(item)

    // append to returned list
    // items.push(item);

    // buffered - write
    writeByMonth(item)

    return Promise.resolve(true)
  }

  return {
    handler: handler,
    getMaxStamp: getMaxStamp,
    historyByType: historyByType
  }
}

// ************ Utilities

//  move to logging module (as Factory?)
function verboseErrorHandler (shouldRethrow) {
  return function errorHandler (error) {
    console.log(error)
    log.error('Rollup:error', {
      error: error
    })
    if (shouldRethrow) {
      throw (error)
    }
  }
}

function logMemAfterGC () {
  function showMem (pfx) {
    var msg = util.format('%sMem after GC (MB)', pfx)
    log.verbose(msg, {
      mem: {
        rss: (process.memoryUsage().rss / 1024 / 1024).toFixed(2),
        heapTotal: (process.memoryUsage().heapTotal / 1024 / 1024).toFixed(2),
        heapUsed: (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)
      }
    })
  }
  showMem('-')
  if (global.gc) {
    global.gc()
    global.gc()
    global.gc()
    global.gc()

    showMem('+')
  } else {
    log.debug('Garbage collection unavailable.  Pass --expose-gc when launching node to enable forced garbage collection.')
  }
  return Promise.resolve(true)
}
