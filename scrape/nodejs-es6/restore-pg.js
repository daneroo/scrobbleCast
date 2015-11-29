'use strict';

// This utility will read all source files: extra=''
// and dunp them into postgres
// Object keys: user/type/uuid/stamp/

// dependencies - core-public-internal
var util = require('util');
var Promise = require('bluebird');
var _ = require('lodash');
var utils = require('./lib/utils');
var srcFile = require('./lib/source/file');
var delta = require('./lib/delta');
var store = require('./lib/store');

// globals
var allCredentials = require('./credentials.json').slice(0, 1);

//  move to logging module (?loggly)
var log = console.error;

Promise.reject(new Error('Skipping Store test!'))
// Promise.resolve(log('Test the store!'))
  .then(() => {
    return store.impl.file.load({
      prefix: '',
      filter: {
        __user: 'stephane'
      }
    }, null);
  })
  .then(() => {
    log('Done testing the store');
  })
  .catch(err => {
    log('ERR:zzzz', err);
    // })
    // .finally((_) => {
    //   process.exit(0);
  });

Promise.resolve(true)
// Promise.reject(new Error('Abort now!'))
  .then(store.impl.pg.init)
  .then(main)
  .then(logMemAfterGC)
  .catch(verboseErrorHandler(false))
  .finally(function() {
    log('Done, done, releasing PG connection');
    store.impl.pg.end();
  });

// aliases
var query = store.impl.pg.pgu.query;
var insert = store.impl.pg.pgu.insert;
// just return result.rows, untils we need otherwise
// function query(sql, values) {
//   return store.impl.pg.pgu.query(sql,values);
// }

// function insert(sql, values) {
//   return store.impl.pg.pgu.insert(sql,values);
// }

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
  });
}

// returns all items from extra, in an array
function restore(credentials, extra) {
  // shared handler for both extras
  var l = loader();
  var sharedHandler = l.handler;

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

  // function with bound local isolated scope
  var progress = (function() {
    var soFar = 0;
    var start = +new Date();

    // the function we are returning, bound to local variables
    return (item) => {
      soFar++;
      // if (elapsed > 2 ) {
      if (soFar % 2000 === 0) {
        var elapsed = (+new Date() - start) / 1000;
        var rate = (soFar / elapsed).toFixed(0) + 'r/s';
        // log('Progress %s: %s', soFar, elapsed, rate);
        log('Progress: %s', rate);
        // soFar = 0;
        // start = +new Date();
      }
    };
  })();

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
  function itemHandler(credentials, stamp, file, item) {

    // throw error if item.__stamp's are non-increasing
    checkStampOrdering(item);

    // log progress
    progress(item);

    // check that we are always called with same user
    checkUser(item);

    // save to database
    return store.impl.pg.save(item);
  }

  return {
    handler: itemHandler,
    getMaxStamp: getMaxStamp
  };
}

function accumulateItems(credentials) {
  console.log('accumulateitems for %s', credentials.name);
  return query('select item from items where __user=$1 order by __user,__stamp,__type,uuid,__sourceType', [credentials.name])
    .then(function(rows) {
      console.log('|rows|= %s', rows.length);
      var _user = credentials.name;
      var historyByType = new delta.AccumulatorByTypeByUuid();
      rows.forEach(function(row) {
        var item = row.item;
        var changeCount = historyByType.merge(item);
        if (changeCount === 0) {
          var msg = util.format('* Item Not deduped: %s %j', changeCount, item);
          utils.logStamp(msg);
          throw new Error(msg);
        }
      });
      log('Merged', rows.length);
      historyByType.sortAndSave(_user);
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
