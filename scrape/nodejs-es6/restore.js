'use strict';

// This utility will read all source files: extra=[snapshots,'']
// and dunp them into postgres
// Object keys: user/type/uuid/stamp/

// dependencies - core-public-internal
var Promise = require('bluebird');
var log = require('./lib/log');
var delta = require('./lib/delta');
var store = require('./lib/store');

// globals
var allCredentials = require('./credentials.json'); //.slice(0, 1);

Promise.resolve(true)
  // Promise.reject(new Error('Abort now!'))
  .then(store.impl.pg.init)
  .then(main)
  .then(logMemAfterGC)
  .catch(verboseErrorHandler(false))
  .finally(function () {
    log.debug('Done, done, releasing PG connection');
    store.impl.pg.end();
  });

function main() {
  return Promise.each(allCredentials, function (credentials) {
    logMemAfterGC();
    log.verbose('Restore started', {
      user: credentials.name
    });
    return restore(credentials)
      .then(function () {
        logMemAfterGC();
        return accumulateItems(credentials);
      });
  });
}

function restore(credentials) {
  // const saver = store.impl.pg.save;
  // TODO(daneroo) batchSaver(.flush) move to pg
  const batchSize = 1000; // which is the default

  const saver = store.impl.pg.saveByBatch(batchSize);

  // let basepaths = ['noredux'];
  // let basepaths = ['snapshots', ''];
  let basepaths = ['rollup', ''];

  return store.impl.file.load({
    prefix: basepaths,
    assert: {
      // stampOrder: true,
      // singleUser: true,
      progress: true, // should not be an assertion.
    },
    filter: {
      __user: credentials.name
    }
  }, saver)
    .then(() => {
      return saver.flush();
    });
}

function accumulateItems(credentials) {
  const __user = credentials.name;
  const historyByType = new delta.AccumulatorByTypeByUuid();
  log.debug('accumulateItems', {
    user: __user
  });
  const opts = {
    filter: {
      __user: __user
    }
  };

  function itemHandler(item) {
    var changeCount = historyByType.merge(item);
    if (changeCount === 0) {
      // throw new Error(`Item Not deduped: |Δ|:${changeCount} ${JSON.stringify(item)}`);
      log.verbose(`Item Not deduped: |Δ|:${changeCount}  ${item.__sourceType} ${item.title}`);
    }
    return Promise.resolve(true);
  }

  return store.impl.pg.load(opts, itemHandler)
    .then((results) => {
      log.verbose('Merged', results.length);
      historyByType.sortAndSave(__user);
    });

}

// ************ Utilities

//TODO(daneroo): move to log.debugging module (as Factory?)
function verboseErrorHandler(shouldRethrow) {
  return function errorHandler(error) {
    log.error('error', error);
    if (shouldRethrow) {
      throw (error);
    }
  };
}

function logMemAfterGC() {
  function showMem(pfx) {
    const mu = process.memoryUsage();
    const inMB = (numBytes) => (numBytes / 1024 / 1024).toFixed(2) + 'MB';
    log.debug(pfx + 'Mem', {
      rss: inMB(mu.rss)
      // heapTotal: inMB(mu.heapTotal),
      // heapUsed: inMB(mu.heapUsed)
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
    log.debug('  Garbage collection unavailable.  Pass --expose-gc when launching node to enable forced garbage collection.');
  }
  return Promise.resolve(true);
}
