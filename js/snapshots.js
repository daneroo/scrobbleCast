'use strict';

// Was forked from rollup.js
// This utility will read all db entries
//   required filter: __user
// and 'rollup' into Month files: with stamps up to (strict <) begining of month
//  -optional jsonl
// TODO(daneroo): maybe ...
//  -verify deduped
//  -optional gzipping
//  -optional partial signature? in content
//  -optional content addressable filename (include md5 sig)
// verify or write new required rollups

// dependencies - core-public-internal
var util = require('util');
var Promise = require('bluebird');
var config = require('./lib/config');
var log = require('./lib/log');
var sinkFile = require('./lib/sink/file');
var delta = require('./lib/delta');
var store = require('./lib/store');

// globals
var allCredentials = require('./credentials.json');

Promise.resolve(true)
  .then(main)
  .then(logMemAfterGC)
  .catch(verboseErrorHandler(false));

// TODO: The eventual flow should be
// -loadItems from extra=''
//  perform dedup checking as we go, removing the need for accumulating all Items, only currentMonth
// at the end validate that history with/without rollup is identical
function main() {
  return Promise.each(allCredentials, function (credentials) {
    logMemAfterGC();
    log.info('Snapshots started', { user: credentials.name });
    return loadItems(credentials);
  });
}

// returns all items from extra, in an array
function loadItems(credentials) {
  // shared handler for both extras
  var l = loader();
  var sharedHandler = l.handler;
  var historyByType = l.historyByType;
  var flush = l.flush;

  return store.impl.pg.load({
    filter: {
      __user: credentials.name
    }
  }, sharedHandler)
    .then((items) => {
      flush() // ok, cause it's synchronous (for now)
      log.verbose('Snapshot:counts', {
        user: credentials.name,
        items: items.length
      });
    })
    .then(() => {
      var _user = credentials.name;
      historyByType.sortAndSave(_user);
      return Promise.resolve(true);
    });

}

// return an item handler for srcFile.iterator which:
// - reports item progress (moved to write logging)
// - validates increasing stamp order
// - acccumulates items in an {type:[items]} which is passed in.
// - writes out any completed months
function loader() {

  // throw error if item.__stamp's are non-increasing
  var maxStamp = '1970-01-01T00:00:00Z'; // to track increasing'ness
  function getMaxStamp() {
    return maxStamp;
  }

  function checkStampOrdering(item) {
    var stamp = item.__stamp;
    if (stamp < maxStamp) {
      log.verbose('Item stamp not increasing', {
        maxStamp: maxStamp,
        item: item
      });
      throw new Error('Item stamp not increasing');
    }
    maxStamp = stamp;
  }

  var singleUser; // used to validate that all items have same user
  // validates that we are always called with a single user, throws on violation
  function checkUser(item) {
    // validate that all items are for same user
    if (!singleUser) {
      singleUser = item.__user;
    } else if (singleUser !== item.__user) {
      var msg = 'Mixing users in loader';
      log.error(msg, {
        expected: singleUser,
        found: item.__user
      });
      throw new Error(msg);
    }
  }

  var historyByType = new delta.AccumulatorByTypeByUuid();
  // Validate that source was properly deduped, and enable history checksum
  function checkForDedup(item) {
    var changeCount = historyByType.merge(item);
    if (changeCount === 0) {
      log.verbose('Item not deduped', {
        changeCount: changeCount,
        item: item
      });
      var msg = util.format('* Item Not deduped: %s %j', changeCount, item);
      throw new Error(msg);
    }

  }

  // accumulate items by month, and write out
  // since we are not writing the last month, it is not a problem,
  // that the last accumulated month will never be written out
  var previousMonth = null; // stamp for current month
  var itemsForMonth = [];

  function writeByMonth(item) {
    var __stamp = new Date(Date.parse(item.__stamp));
    // find begining of month (UTC)
    var month = new Date(Date.UTC(__stamp.getUTCFullYear(), __stamp.getUTCMonth())).toJSON();
    // iso8601, remove millis
    month = month.replace(/\.\d{3}Z$/, 'Z');

    var shouldWrite = previousMonth !== null && month !== previousMonth;
    if (shouldWrite) {
      // actually write out the month: all types;
      var _user = item.__user;
      var suffix = 'jsonl';

      //TODO(daneroo) replace data/ with sink.dataDirName
      var outfile = util.format('data/snapshots/monthly/%s/monthly-%s-%s.%s', _user, _user, previousMonth, suffix);
      sinkFile.write(outfile, itemsForMonth, {
        // TODO overwrite should be false, causing errors!
        // TODO Write verification needs to account for .jsonl
        overwrite: false,
        log: true
      });
      itemsForMonth = [];
    }
    itemsForMonth.push(item);
    previousMonth = month;
  }
  function flush() {
    // items is the result of the pg-load being passed through the promise chain
    const remaining = itemsForMonth
    log.verbose('Snapshot:flush', { remaining: remaining.length })
    if (remaining.length > 0) {
      var _user = remaining[0].__user;
      var suffix = 'jsonl';
      var hostname = config.hostname;

      //TODO(daneroo) replace data/ with sink.dataDirName
      var outfile = util.format('data/snapshots/current/%s/current-%s.%s.%s', _user, hostname, _user, suffix);
      sinkFile.write(outfile, itemsForMonth, {
        // TODO overwrite should be true for current/flush
        // TODO Write verification needs to account for .jsonl
        overwrite: true,
        log: true
      });
      itemsForMonth = [];
    }
  }
  // the actual itemHandler being returned
  var handler = function itemHandler(item) {
    // console.log('..stamp',stamp);
    // throw error if item.__stamp's are non-increasing
    checkStampOrdering(item);
    // check that we are always called with same user
    checkUser(item);

    checkForDedup(item);

    // append to returned list
    // items.push(item);

    // buffered - write
    writeByMonth(item);

    return Promise.resolve(true);
  };

  return {
    handler: handler,
    getMaxStamp: getMaxStamp,
    historyByType: historyByType,
    flush: flush
  };
}

// ************ Utilities

//  move to logging module (as Factory?)
function verboseErrorHandler(shouldRethrow) {
  return function errorHandler(error) {
    console.log(error);
    log.error('Snapshot:error', {
      error: error
    });
    if (shouldRethrow) {
      throw (error);
    }
  };
}

function logMemAfterGC() {
  function showMem(pfx) {
    var msg = util.format('%sMem after GC (MB)', pfx);
    log.verbose(msg, {
      mem: {
        rss: (process.memoryUsage().rss / 1024 / 1024).toFixed(2),
        heapTotal: (process.memoryUsage().heapTotal / 1024 / 1024).toFixed(2),
        heapUsed: (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)
      }
    });
  }
  showMem('-');
  if (global.gc) {
    global.gc();
    global.gc();
    global.gc();
    global.gc();

    showMem('+');
  } else {
    log.debug('Garbage collection unavailable.  Pass --expose-gc when launching node to enable forced garbage collection.');
  }
  return Promise.resolve(true);
}
