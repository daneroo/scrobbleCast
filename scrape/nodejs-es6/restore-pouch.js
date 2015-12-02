'use strict';

// This utility will read all source files: extra=''
// and dunp them into postgres
// Object keys: user/type/uuid/stamp/

// dependencies - core-public-internal
var Promise = require('bluebird');
var _ = require('lodash');
var log = require('./lib/log');
var delta = require('./lib/delta');
var store = require('./lib/store');

// globals
var allCredentials = require('./credentials.json').slice(0, 1);

Promise.resolve(true)
  // Promise.reject(new Error('Abort now!'))
  .then(() => {
    log.debug('Start testing pouch!');
  })
  .then(store.impl.pouch.init)
  .then(() => {
    const item = {
      _id: 'question',
      answer: Math.floor(Math.random() * 2) * 4 + 42
    };
    return store.impl.pouch.pchu.get(item)
      .then((doc) => {
        log.debug('got doc', JSON.stringify(doc));
        // compare first, and skip if identical,
        // otherwise use the _rev
        if (doc) {
          const _rev = doc._rev;
          delete doc._rev;
          const isIdentical = _.isEqual(item, doc);
          if (isIdentical) {
            log.debug('doc confirmed identical', JSON.stringify(doc));
            // simulate
            return {
              ok: true,
              id: doc._id,
              rev: _rev
            };
          } else {
            log.debug('-doc not identical', JSON.stringify(doc));
            log.debug('+itm not identical', JSON.stringify(item));
          }
          item._rev = _rev;
        }
        log.debug('-%s doc', (doc) ? 'update' : 'new', JSON.stringify(item));
        return store.impl.pouch.pchu.put(item);
      });
  })
  .then(() => {
    log.debug('Done testing pouch!');
  })
  .finally(function() {
    log.debug('Done, done, releasing Pouch connection');
    store.impl.pouch.end();
  });

if (0) Promise.resolve(true)
  // Promise.reject(new Error('Abort now!'))
  .then(store.impl.pouch.init)
  .then(main)
  .then(logMemAfterGC)
  .catch(verboseErrorHandler(false))
  .finally(function() {
    log.debug('Done, done, releasing Pouch connection');
    store.impl.pouch.end();
  });

function main() {
  var extra = '';
  // var extra = 'rollup'; // to switch to rollup..
  return Promise.each(allCredentials, function(credentials) {
    logMemAfterGC();
    log.verbose('Restore started', {
      user: credentials.name
    });
    return restore(credentials, extra)
      .then(function() {
        logMemAfterGC();
        return accumulateItems(credentials);
      });
  });
}

// returns all items from extra, in an array
function restore(credentials, extra) {

  return store.impl.file.load({
    prefix: extra,
    assert: {
      // stampOrder: true,
      // singleUser: true,
      progress: true, // should not be an assertion.
    },
    filter: {
      __user: credentials.name
    }
  }, store.impl.pouch.save);

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
      throw new Error(`Item Not deduped: |Δ|:${changeCount} ${JSON.stringify(item)}`);
    }
    return Promise.resolve(true);
  }

  return store.impl.pouch.load(opts, itemHandler)
    .then((results) => {
      log.debug('Merged', results.length);
      historyByType.sortAndSave(__user);
    });

}

// ************ Utilities

//  move to log.debugging module (as Factory?)
function verboseErrorHandler(shouldRethrow) {
  return function errorHandler(error) {
    log.debug('error', error);
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
