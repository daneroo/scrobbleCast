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
var delta = require('./lib/delta');

// globals
var allCredentials = require('./credentials.json');

//  move to logging module (?loggly)
var log = console.error;

Promise.resolve(true)
  .then(main)
  .then(logMemAfterGC)
  .catch(verboseErrorHandler(false));

function main() {
  var extra = '';
  // var extra = 'noredux'; // to switch to noredux..
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
  return srcFile.iterator(extra, [credentials], loader(itemsByType), '**/*.json')
    .then(function(counts) {
      Object.keys(counts).forEach(function(name) {
        var c = counts[name];
        log('--' + extra + '-- ' + name, ' |stamps|:' + c.stamp + ' |f|:' + c.file + ' |p|:' + c.part);
      });
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
    return Promise.each(['podcast', 'episode'], function(_type) {
        var accululatorForType = new delta.AccumulatorByUuid();
        var items = itemsByType[_type];
        items.forEach(function(item) {
          // var accByUUIDForItem = getAccumulator(item);
          // var changeCount = accByUUIDForItem.merge(item);
          var changeCount = accululatorForType.merge(item);
          if (changeCount === 0) {
            console.log('***** Not deduped: %s %j', changeCount, item);
          }
        });
        sortAndSave(_user, _type, accululatorForType);
        return Promise.resolve(true);
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
      saveLines(itemsForMonth, outfile);

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

// TODO: move to lib
function sortAndSave(_user, _type, history) {
  // console.log('|' + outfile + '|=', _.size(history.accumulators));
  // just write out the accumulators dictionary, it is the only attribute!
  var sorted = _.sortBy(history.accumulators, function(item) {
    // should this use sortByAll ? not in 2.4.2
    // careful sorting by [__changeCount], compare by string when returning an array
    // this sorts by a numerically
    // _.sortBy([{a:1},{a:2},{a:3},{a:11},{a:12}],function(item){return item.a;});
    // this sorts a lexicographically
    // _.sortBy([{a:1,b:'a'},{a:2,b:'a'},{a:3,b:'a'},{a:11,b:'a'},{a:12,b:'a'}],function(item){return [item.a,item.b];})
    // return [item.meta.__changeCount,item.meta.__lastUpdated, item.uuid];

    // sort by lastUpdated,uuid (for uniqueness)
    return [item.meta.__lastUpdated, item.uuid];
  }).reverse();
  var outfile = util.format('history-%s-%s.json', _user, _type);
  saveLines(sorted, outfile);
}

// outputs as JSON: either .json, or .jsonl
// TODO move to lib
// TODO, options: pretty=true, gzip=true, sign=true, log
function saveLines(thing, outfile) {
  if (!Array.isArray(thing)) {
    console.log('saveLines:thing is not an array');
    process.exit(-1);
  }
  var json;
  if (outfile.match(/\.jsonl$/)) {
    var lines = [];
    thing.forEach(function(el) {
      lines.push(JSON.stringify(el));
    });
    json = lines.join('\n');
  } else {
    json = JSON.stringify(thing, null, 2);
  }
  var dir = path.dirname(outfile);
  mkdirp.sync(dir);
  fs.writeFileSync(outfile, json);
  log('md5(%s):%s %si %sMB', path.basename(outfile), md5(json), thing.length, (json.length / 1024 / 1024).toFixed(2));
}

function md5(str) {
  var hash = crypto.createHash('md5').update(str).digest('hex');
  return hash;
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
