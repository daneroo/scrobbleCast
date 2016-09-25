'use strict';

// This utility will read all source files: extra=''
// and dunp them into postgres
// Object keys: user/type/uuid/stamp/

// dependencies - core-public-internal
var Promise = require('bluebird');
var log = require('./lib/log');
var store = require('./lib/store');
var utils = require('./lib/utils');

// globals
var allCredentials = require('./credentials.json'); //.slice(0, 1);

Promise.resolve(true)
  // Promise.reject(new Error('Abort now!'))
  .then(store.impl.pg.init)
  .then(sync)
  .then(logMemAfterGC)
  .catch(verboseErrorHandler(false))
  .finally(function () {
    log.debug('Done, done, releasing PG connection');
    store.impl.pg.end();
  });

function sync() {
  return Promise.each(allCredentials, function (credentials) {
    log.verbose('Sync started', {
      user: credentials.name
    });
    let fileItems;
    let dbItems;
    return loadFromFiles(credentials)
      .then(function (items) {
        fileItems = items;
        log.verbose('|fileItems|',fileItems.length);
        logMemAfterGC();
        return loadFromDB(credentials);
      })
      .then(function (items) {
        dbItems = items;
        log.verbose('|dbItems|',dbItems.length);
        log.verbose('Comparing for %s', credentials.name);
        return compare(fileItems, dbItems);
      })
  });
}

function compare(fileItems, dbItems) {
  const DIGEST_ALGORITHM = 'sha256';
  log.verbose('loaded %d file items', fileItems.length);
  log.verbose('loaded %d db   items', dbItems.length);

  function storeByHash(acc, item) {
    var digest = utils.digest(JSON.stringify(item), DIGEST_ALGORITHM, false);
    acc[digest] = item;
    return acc;
  }

  const fileHash = fileItems.reduce(storeByHash, {});
  const dbHash = dbItems.reduce(storeByHash, {});
  log.verbose('hashed %d file items', Object.keys(fileHash).length);
  log.verbose('hashed %d db   items', Object.keys(dbHash).length);

  Object.keys(fileHash).forEach(function (digest, idx) {
    if (!dbHash[digest]) {
      // log.verbose('file item %s not found in db',digest);
      const item = fileHash[digest];
      log.verbose('-file & !db', item.__stamp, item.title, idx);
      if (idx === 89937) log.verbose('    ', item);
    }
  });
  Object.keys(dbHash).forEach(function (digest, idx) {
    if (!fileHash[digest]) {
      // log.verbose('db item %s not found in file',digest);
      const item = dbHash[digest];
      log.verbose('-db & !file', item.__stamp, item.title, idx);
      if (idx === 89937) log.verbose('    ', item);
    }
  });
}
// first load from extra=rollup, then from extra=''
function loadFromFiles(credentials) {
  log.debug('loadFromFiles', {
    user: credentials.name
  });
  const items = [];
  const accumulator = function (item) {
    items.push(item);
  };

  let basepaths = ['rollup', ''];

  return store.impl.file.load({
    prefix: basepaths,
    assert: {
      // stampOrder: true,
      // singleUser: true,
      progress: false, // should not be an assertion.
    },
    filter: {
      __user: credentials.name
    }
  }, accumulator)
    .then(function () {
      // log.verbose('loaded %d file items for %s', items.length, credentials.name);
      return items;
    });
}

function loadFromDB(credentials) {
  log.debug('loadFromDB', {
    user: credentials.name
  });
  const items = [];
  const accumulator = function (item) {
    items.push(item);
  };
  const opts = {
    filter: {
      __user: credentials.name
    }
  };

  return store.impl.pg.load(opts, accumulator)
    .then(function () {
      // log.verbose('loaded %d db items for %s', items.length, credentials.name);
      return items;
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
