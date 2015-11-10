'use strict';

// This utility will read all source files: extra=''
// and dunp them into redis
// Object keys: user/type/uuid/stamp/

// dependencies - core-public-internal
var util = require('util');
var Promise = require('bluebird');
var utils = require('./lib/utils');
var srcFile = require('./lib/source/file');
var delta = require('./lib/delta');

var redis = require('redis');
Promise.promisifyAll(redis.RedisClient.prototype);
Promise.promisifyAll(redis.Multi.prototype);
var client = redis.createClient({
  host: 'docker'
});

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
  // var extra = 'rollup'; // to switch to rollup..
  return Promise.each(allCredentials, function(credentials) {
      logMemAfterGC();
      utils.logStamp('Restore started for ' + credentials.name);
      return restore(credentials, extra)
        .then(function() {
          return accumulateItems(credentials);
        });
    })
    .then(function() {
      client.unref();
    });
}

// returns all items from extra, in an array
function restore(credentials, extra) {

  // shared handler for both extras
  var l = loader();
  var sharedHandler = l.handler;
  // var historyByType = l.historyByType;

  function reportCounts(counts) {
    Object.keys(counts).forEach(function(name) {
      var c = counts[name];
      var msg = util.format('base:%s user:%s |stamps|:%s |f|:%s |p|:%s |ignored|:%s', extra, name, c.stamp, c.file, c.part, c.ignoredFiles);
      utils.logStamp(msg);
    });
    return Promise.resolve(true);
  }

  // TODO: clean this up for final logic, with opts
  // this is the double iteration loader
  // return srcFile.iteratorWithRollup(extra, [credentials], sharedHandler, '**/*.json?(l)')
  return srcFile.iterator(extra, [credentials], sharedHandler, '**/*.json?(l)')
    .then(reportCounts);
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
      log('Item stamp not increasing: %s > %j', maxStamp, item);
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
      log('Mixing users in loader: %s != %s', singleUser, item.__user);
      throw new Error('Mixing users in loader');
    }
  }

  // the actual itemHandler being returned
  var handler = function itemHandler(credentials, stamp, file, item) {
    // throw error if item.__stamp's are non-increasing
    checkStampOrdering(item);
    // check that we are always called with same user
    checkUser(item);

    // save to database
    return saveItem(item);
    // return saveItemByAcc(item);
    // return saveItem(item)
    //   .then(function() {
    //     return saveItemByAcc(item);
    //   });
  };

  return {
    handler: handler,
    getMaxStamp: getMaxStamp
  };
}

function accumulateItems(credentials) {
  console.log('accumulateitems for %s', credentials.name);
  var cursor = '0';
  var count = 0;

  var itemKeys = [];

  function scan(resolve, reject) {
    client.scan(
      cursor,
      'MATCH', 'item:' + credentials.name + '/*',
      'COUNT', '1000',
      function(err, res) {
        if (err) {
          reject(err);
        }
        // Update the cursor position for the next scan
        cursor = res[0];

        // From <http://redis.io/commands/scan>:
        // 'An iteration starts when the cursor is set to 0,
        // and terminates when the cursor returned by the server is 0.'
        if (cursor === '0') {
          resolve(itemKeys);
          return console.log('Iteration for %s complete: %s', credentials.name, count);
        }
        // Remember: more or less than COUNT or no keys may be returned
        // See http://redis.io/commands/scan#the-count-option
        // Also, SCAN may return the same key multiple times
        // See http://redis.io/commands/scan#scan-guarantees

        if (res[1].length > 0) {
          res[1].forEach(function(key) {
            count++;
            itemKeys.push(key);
            // console.log('-would fetch', key);
          });
        }

        return scan(resolve, reject);
      }
    );
  }
  return new Promise(function(resolve, reject) {
      scan(resolve, reject);
    })
    .then(function(itemKeys) {
      console.log('sorting %s keys', itemKeys.length);
      itemKeys.sort();
      var historyByType = new delta.AccumulatorByTypeByUuid();

      return Promise.each(itemKeys, function(key) {
          if (key.indexOf('ede41160-9eeb-012f-3e7d-525400c11844') !== -1) {
            console.log('fetching %s', key);
          }
          return client.getAsync(key)
            .then(function(res) {
              var item = JSON.parse(res);
              if (item.uuid === 'ede41160-9eeb-012f-3e7d-525400c11844') {
                console.log('got %j', item);
              }
              var changeCount = historyByType.merge(item);
              if (changeCount === 0) {
                var msg = util.format('* Item Not deduped: %s %j', changeCount, item);
                utils.logStamp(msg);
                // throw new Error(msg);
              }
            });
        })
        .then(function() {
          console.log('|key|= %s', itemKeys.length);
          var _user = credentials.name;
          historyByType.sortAndSave(_user);
        });
    });
}
//
// Save each item : problem, how do we traverse keys in an ordered way?
function saveItem(item) {
  function getKey(item) {
    var key = [item.__user, item.__stamp, item.__type, item.uuid, item.__sourceType].join('/');
    return 'item:' + key;
  }

  var key = getKey(item);
  if (item.uuid === 'ede41160-9eeb-012f-3e7d-525400c11844') {
    console.log('-save', key);
  }
  // console.log('-save', key);
  return client.getsetAsync(key, JSON.stringify(item))
    .then(function(res) {
      var ok = true;
      if (res !== null) {
        var olditem = JSON.parse(res);
        ok = utils.isEqualWithoutPrototypes(olditem, item);
        if (!ok) {
          // console.log('+save %s ok: %j', key, ok);
        } else {
          // console.log('+save %s DUPLICATE ok: %j', key, ok);
        }
      }
      // console.log('+save %s ok: %j', key, ok);
      return true;
    });
}

// appends item to a sorted list
// the key is the accumulator key,
// the score is the _stamp -> int
function saveItemByAcc(item) {
  function getKey(item) {
    // this would be for the accumulator
    var key = [item.__user, item.__type, item.uuid].join('/');
    return 'acc:' + key;
  }

  function getScore(item) {
    return new Date(item.__stamp).getTime();
  }

  var key = getKey(item);
  var score = getScore(item);
  console.log('-zadd', key);
  return client.zaddAsync(key, score, JSON.stringify(item))
    .then(function(res) {
      console.log('+zadd %s res: %j', key, res);
      return true;
    });
}

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
    var msg = util.format('%sMem RSS: %sMB, Heap(t): %sMB, Heap(u): %sMB',
      pfx, (process.memoryUsage().rss / 1024 / 1024).toFixed(2), (process.memoryUsage().heapTotal / 1024 / 1024).toFixed(2), (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)
    );
    utils.logStamp(msg);
  }
  showMem('-');
  if (global.gc) {
    global.gc();
    global.gc();
    global.gc();
    global.gc();

    showMem('+');
  } else {
    utils.logStamp('  Garbage collection unavailable.  Pass --expose-gc when launching node to enable forced garbage collection.');
  }
  return Promise.resolve(true);
}
