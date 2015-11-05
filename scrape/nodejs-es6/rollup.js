"use strict";

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
var fs = require('fs');
var util = require('util');
var path = require('path');
var crypto = require('crypto');
var mkdirp = require('mkdirp');
var Promise = require('bluebird');
var _ = require('lodash');
var utils = require('./lib/utils');
var srcFile = require('./lib/source/file');
var sinkFile = require('./lib/sink/file');
var delta = require('./lib/delta');

// globals
var allCredentials = require('./credentials.json');

//  move to logging module (?loggly)
var log = console.error;

Promise.resolve(true)
  .then(main)
  .then(logMemAfterGC)
  .catch(verboseErrorHandler(false));

// TODO: The eventual flow should be
// -loadItems from extra=''
//  perform dedup checking as we go, removing the need for accumulating all Items, only currentMonth
// at the end validate that history with/without rollup is identical
function main() {
  var extra = '';
  // var extra = 'rollup'; // to switch to rollup..
  return Promise.each(allCredentials, function(credentials) {
    logMemAfterGC();
    console.log('***** Rolling up %s', credentials.name);
    return rollup(credentials, extra);
    // return Promise.resolve(true);
  });
}

function rollup(credentials, extra) {
  // blank out accumulators
  return loadItems(credentials, extra)
    .then(validateDedupAndSaveHistory(credentials));
}

// returns all items from extra, in an array
function loadItems(credentials, extra) {
  var itemsByType = {};
  // utility func to get maxStamp from types
  function maxStampForType(_type) {
    var entries = itemsByType[_type];
    return entries[entries.length - 1].__stamp;
  }
  // shared handler for both extras
  var sharedHandler = loader(itemsByType);
  var maxStamp; // maxStamp from firstStage
  function reportCounts(counts) {
    Object.keys(counts).forEach(function(name) {
      var c = counts[name];
      var pmax = maxStampForType('podcast');
      var emax = maxStampForType('episode');
      maxStamp = (pmax > emax) ? pmax : emax;
      log('--%s-- %s |stamps|:%s |f|:%s |p|:%s max(stamp):%s', extra, name, c.stamp, c.file, c.part, maxStamp);
    });
    return Promise.resolve(true);
  }
  return srcFile.iterator(extra, [credentials], sharedHandler, '**/*.json?(l)')
    .then(reportCounts)
    .then(function() {
      if (extra == 'rollup') {
        log('Reading rest of entries from default');
      } else {
        log('NOT Reading rest of entries from default');
        return Promise.resolve(true);
      }

      function skippingHandler(credentials, stamp, file, item) {
        if (stamp <= maxStamp) {
          // log('skipping %s %s', stamp, item.__stamp);
          return Promise.resolve(true);
        }

        // log('doing    %s %s', stamp, item.__stamp);
        return sharedHandler(credentials, stamp, file, item);
      }
      // now call with extra=''
      return srcFile.iterator('', [credentials], skippingHandler, '**/*.json?(l)')
        .then(reportCounts);
    })
    .then(function() {
      return itemsByType;
    });
}

// return a function to validate deduplication, bound to credentials (user)
function validateDedupAndSaveHistory(credentials) {
  return function(itemsByType) {
    // rerun accum to verify dedeuped'ness
    var _user = credentials.name;
    var historyByType = new delta.AccumulatorByTypeByUuid();
    return Promise.each(['podcast', 'episode'], function(_type) {
        var items = itemsByType[_type];
        items.forEach(function(item) {
          var changeCount = historyByType.merge(item);
          if (changeCount === 0) {
            console.log('***** Not deduped: %s %j', changeCount, item);
          }
        });
      })
      .then(function() {
        historyByType.sortAndSave(_user);
      })
      .then(function() {
        return itemsByType;
      });
  };
}

// return an item handler for srcFile.iterator which:
// - reports item progress (moved to write logging)
// - validates increasing stamp order
// - acccumulates items in an {type:[items]} which is passed in.
// - writes out any completed months
function loader(itemsByType) {
  // throw error if item.__stamp's are non-increasing
  var increasingStamp = null; // to track increasing'ness
  function checkStampOrdering(item) {
    var stamp = item.__stamp;
    if (stamp < increasingStamp) {
      log('Item stamp not increasing: %s > %j', increasingStamp, item);
      throw new Error('Item stamp not increasing');
    }
    increasingStamp = stamp;
  }

  // Lookup (and init) of injected itemsByType array
  // also validates that we are always called with a single user
  var singleUser; // used to validate that all items have same user
  function getItems(item) {
    // validate that all items are for same user
    if (!singleUser) {
      singleUser = item.__user;
    } else if (singleUser !== item.__user) {
      log('Mixing users in loader: %s != %s', singleUser, item.__user);
      throw new Error('Mixing users in loader');
    }

    // intialize and/or return the array
    var __type = item.__type;
    if (!itemsByType[__type]) {
      itemsByType[__type] = [];
    }
    return itemsByType[__type];
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
      // log('+writing month:', [item.__user, previousMonth, itemsForMonth.length]);

      // actually write out the month: all types;
      var _user = item.__user;
      var suffix = 'jsonl';
      var outfile = util.format('data/rollup/byUserStamp/%s/%s/monthly-%s.%s', _user, previousMonth, previousMonth, suffix);
      sinkFile.write(outfile, itemsForMonth, {
        overwrite: true,
        log: true
      });

      // empty output buffer
      itemsForMonth = [];
    }
    itemsForMonth.push(item);
    previousMonth = month;
  }

  // the actual itemHandler being returned
  return function itemHandler(credentials, stamp, file, item) {
    // throw error if item.__stamp's are non-increasing
    checkStampOrdering(item);

    // append to returned list
    getItems(item).push(item);

    // buffered - write
    writeByMonth(item);

    return Promise.resolve(true);
  };
}

// Unused For now
// //  compose - filter generator : before, or after a date
// function dateFilterHandler(itemHandler, dateFilter) {
//   return function newItemHandler(credentials, stamp, file, item) {
//     if (dateFilter(item)) {
//       itemHandler(credentials, stamp, file, item);
//     }
//   }
// }

// function beforeOrOnFilter(compareStamp) {
//   return function(item) {
//     var stamp = item.__stamp;
//     return stamp <= compareStamp;
//   }
// }

// function afterFilter(compareStamp) {
//   return function(item) {
//     var stamp = item.__stamp;
//     return stamp > compareStamp;
//   }
// }

// ************ Utilities

//  move to logging module (as Factory?)
function verboseErrorHandler(shouldRethrow) {
  return function errorHandler(error) {
    log('error', error);
    if (shouldRethrow) {
      throw (error);
    }
  };
}

function logMemAfterGC() {
  function showMem(pfx) {
    console.log('%sMem RSS: %sMB, Heap(t): %sMB, Heap(u): %sMB',
      pfx, (process.memoryUsage().rss / 1024 / 1024).toFixed(2), (process.memoryUsage().heapTotal / 1024 / 1024).toFixed(2), (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)
    );
  }
  showMem('-');
  if (global.gc) {
    global.gc();
    global.gc();
    global.gc();
    global.gc();

    showMem('+');
  } else {
    console.log('  Garbage collection unavailable.  Pass --expose-gc when launching node to enable forced garbage collection.');
  }
  return Promise.resolve(true);
}
