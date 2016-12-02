'use strict';

// This utility will read all source files: extra=''
// and dunp them into postgres
// Object keys: user/type/uuid/stamp/

// dependencies - core-public-internal
var bluebird = require('bluebird');
var _ = require('lodash');
var rp = require('request-promise');
var log = require('./lib/log');
var store = require('./lib/store');

// globals
const baseURI = (process.argv.length > 2) ? process.argv[2] : 'http://euler:8000/api'

Promise.resolve(true)
  // Promise.reject(new Error('Abort now!'))
  .then(store.impl.pg.init)
  .then(sync)
  .catch(verboseErrorHandler(false))
  // this used to be a finally clause - for which there is a polyfill: https://www.promisejs.org/api/
  .then(function () {
    log.debug('OK: Done, done, releasing PG connection');
    store.impl.pg.end();
  }, function (err) {
    log.debug('ERR: Done, done, releasing PG connection', err);
    store.impl.pg.end();
  });

function sync() {
  log.verbose(`Sync started from ${baseURI}`);
  let remoteDigests;
  let localDigests;
  return loadFromURL()
    .then(function (items) {
      remoteDigests = items;
      log.verbose('|remoteDigests|', remoteDigests.size);
      logMemAfterGC();
      return loadFromDB();
    })
    .then(function (items) {
      localDigests = items;
      log.verbose('|localDigests|', localDigests.size);
      log.verbose('Comparing digests');
      return compare(remoteDigests, localDigests);
    })
}

function compare(remoteDigests, localDigests) {
  log.verbose('loaded %d remote items', remoteDigests.size);
  log.verbose('loaded %d local  items', localDigests.size);

  const missingLocal = [];
  remoteDigests.forEach(function (acc, digest) {
    if (!localDigests.has(digest)) {
      // log.verbose('-remote & !local', digest);
      missingLocal.push(digest)
    }

  });
  const missingRemote = []
  localDigests.forEach(function (acc, digest) {
    if (!remoteDigests.has(digest)) {
      // log.verbose('-local & !remote', digest);
      missingRemote.push(digest)
    }
  });
  log.verbose(`missing local:${missingLocal.length} remote:${missingRemote.length}`)
  return fetchMissingFromRemote(missingLocal);
}


function fetchMissingFromRemote(missingLocal) {
  return bluebird.each(missingLocal, (digest) => {
    const options = {
      uri: `${baseURI}/digest/${digest}`,
      gzip: true, // for compression
      json: true // Automatically parses the JSON string in the response
    };

    // log.verbose(`--fetching ${options.uri}`)
    return rp(options)
      // .then(store.impl.pg.save)
      .then(saveWithExtraordinaryReconcile)
      .then(() => {
        log.verbose(`--persist:  ${options.uri}`)
      })
      .catch((/*err*/) => {
        log.verbose(`--failed:   ${options.uri}`)
      })
  })
}

// Wraps store.impl.pg.save, with an attempt to resolve primary key violation with a custom rule:
// namely if all fields identical except played_up_to, then select the one with the largest value
function saveWithExtraordinaryReconcile(item) {
  return store.impl.pg.getByKey(item)
    .then(dbitem => {
      if (!dbitem) {
        return store.impl.pg.save(item)
      }
      var isIdentical = _.isEqual(item, dbitem);
      // if an identical item existed, we would not be in reconciliation
      log.verbose(`--obviously  identical:= ${isIdentical}`)

      let mismatchedKeys = []
      Object.keys(item).forEach(k => {
        if (item[k] !== dbitem[k]) {
          log.verbose(`  ${k}: ${item[k]} != ${dbitem[k]}`)
          mismatchedKeys.push(k)
        }
      })
      mismatchedKeys = mismatchedKeys.sort()

      // condition of extraordinary reconciliation
      // First Case: only difference is in the played_up_to field
      // - item.played_up_to > dbitem.played_up_to
      if (_.isEqual(['played_up_to'], mismatchedKeys)) {
        log.verbose('-sync:extraordinary:1')
        log.verbose(`--item    ${JSON.stringify(dbitem)}`)
        log.verbose(`--dbitem  ${JSON.stringify(dbitem)}`)
        if (item.played_up_to > dbitem.played_up_to) {
          log.info('sync:extraordinary:1 reconciliation', item)
          return store.impl.pg.remove(dbitem)
            .then(() => {
              return store.impl.pg.save(item)
            })
        } else {
          log.info('sync:extraordinary:1 reconciliation ignored, let the other side do it!', item)
        }
      }
      // Second case: only differences are played_up_to, and playing_status
      // - item.played_up_to > dbitem.played_up_to, and
      // - item.playing_status > dbitem.playing_status
      // } else if (_.isEqual(['played_up_to', 'playing_status'])) {
      if (_.isEqual(['played_up_to', 'playing_status'], mismatchedKeys)) {
        log.verbose('-sync:extraordinary:2')
        log.verbose(`--item    ${JSON.stringify(dbitem)}`)
        log.verbose(`--dbitem  ${JSON.stringify(dbitem)}`)
        if (item.played_up_to > dbitem.played_up_to &&
          item.playing_status > dbitem.playing_status) {
          log.info('sync:extraordinary:2 reconciliation', item)
          return store.impl.pg.remove(dbitem)
            .then(() => {
              return store.impl.pg.save(item)
            })
        } else {
          log.info('sync:extraordinary:2 reconciliation ignored, let the other side do it!', item)
        }
      }

      // default to the normal error processing
      return store.impl.pg.save(item)
    })
}
function loadFromURL() {
  const options = {
    uri: `${baseURI}/digests`,
    gzip: true, // for compression
    json: true // Automatically parses the JSON string in the response
  };

  return rp(options)
    .then(function (digests) {
      return new Set(digests)
    });
}
function loadFromDB() {
  log.debug('loadFromDB');
  return store.impl.pg.digests()
    .then(function (digests) {
      return new Set(digests);
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
