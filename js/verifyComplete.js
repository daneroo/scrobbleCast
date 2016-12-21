'use strict';

// To add more head memory!
// node --max-old-space-size=4096 verifyComplete.js
// - verbose: +file.load prefix=[rollup, , archive, noredux, redux, snapshots], user=stephane, item=1091486, file=36800
// - verbose: +file.load prefix=[rollup, , archive, noredux, redux, snapshots], user=daniel, item=3001405, file=89762

// This will verify that all file in ([dirs...]) are accounted for in the database

// -Load all items from db into map[uuid]=[items for uuid]
// -foreach item i to be checked [dirs...]
//   -add i to all[i.uuid], and check for dups, should only be i

// dependencies - core-public-internal
var Promise = require('bluebird');
var _ = require('lodash');
var log = require('./lib/log');
// var delta = require('./lib/delta');
var store = require('./lib/store');
var delta = require('./lib/delta');
var utils = require('./lib/utils');

// globals
var allCredentials = require('./credentials.json'); //.slice(0, 1);
// let basepaths = ['rollup', '']; // VERIFIED (13s)
// let basepaths = ['archive']; // VERIFIED (44s)
// let basepaths = ['noredux']; // VERIFIED (5358s)
// let basepaths = ['redux']; // EMTPY ! VERIFIED
// let basepaths = ['snapshots', '']; // VERIFIED (12s)
// all VERIFIED (5634s)
let basepaths = ['rollup', '', 'archive', 'redux', 'snapshots', 'noredux'];

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
    log.verbose('VerifyComplete started', {
      user: credentials.name
    });
    return preload(credentials)
      .then(function (itemsByUuid) {
        logMemAfterGC();
        return verify(credentials, itemsByUuid);
      });
  });
}

function md5i(item) { return utils.md5(JSON.stringify(item)) }

let todo = 0
let verified = 0
let total = 0
let md5sByUuid = {} // must be reset after user (top of verify function)

function doesThisChangeAnything(item, itemsByUuid) {
  total++
  const compareTo = itemsByUuid[item.uuid]
  const md5 = md5i(item);

  if (!md5sByUuid[item.uuid]) {
    md5sByUuid[item.uuid] = {}
    compareTo.forEach(function (ii) {
      md5sByUuid[item.uuid][md5i(ii)] = true
    });
  }
  const byMd5 = md5sByUuid[item.uuid];
  if (byMd5[md5]) {
    verified++
    return Promise.resolve(true)
    // log.debug('verified item', { uuid: item.uuid, md5: md5, compareTo: compareTo.length })
  }

  const withItem = compareTo.slice(0)
  withItem.push(item)
  const sorted = _.sortBy(withItem, ['__stamp', '__sourceType']);

  // log.verbose(JSON.stringify(sorted))
  const acc = new delta.Accumulator();
  let fishy = false;
  sorted.forEach((ii) => {
    const md5ii = md5i(ii)
    const itemOfInterest = (md5 == md5ii)

    // let pfx = (itemOfInterest) ? '*' : '-'
    const changes = acc.merge(ii)
    const changed = changes.length > 0
    // log.verbose(pfx, { Δ:(changed),uuid: ii.uuid, md5:md5ii, stamp: ii.__stamp, source: ii.__sourceType })

    if (itemOfInterest && changed) {
      fishy = true // new item should be insterted
      // log.verbose(pfx, { Δ: (changed), uuid: ii.uuid, stamp: ii.__stamp, source: ii.__sourceType })
      console.log(JSON.stringify(ii))
    }
    if (itemOfInterest && !changed) {
      verified++
    }
    if (!itemOfInterest && !changed) {
      fishy = true
      // original items no deduped
      // log.verbose(pfx, { Δ: (changed), uuid: ii.uuid, stamp: ii.__stamp, source: ii.__sourceType })
      console.log(JSON.stringify(ii))
    }
  })

  if (fishy) {
    todo++
  } else {
    verified++
  }
  if (fishy) {
    // log.verbose('------')
    // console.log(JSON.stringify(byMd5, null, 2));
    log.verbose('------')
    sorted.forEach((ii) => {
      const md5ii = md5i(ii)
      const itemOfInterest = (md5 == md5ii)
      let pfx = (itemOfInterest) ? '*' : '-'
      const changed = acc.merge(ii).length > 0
      log.verbose(pfx, { Δ: (changed), uuid: ii.uuid, md5: md5ii, stamp: ii.__stamp, source:ii.__sourceType, played: ii.played_up_to })
    })
    // sorted.forEach((ii) => {
    //   console.log(JSON.stringify(ii))
    // })
  }
  return Promise.resolve(true)
}

function verify(credentials, itemsByUuid) {
  md5sByUuid = {}
  log.debug('Start verifying items', {
    user: credentials.name,
    uuids: Object.keys(itemsByUuid).length
  });

  const itemHandler = (item) => {
    // log.debug('verifying item', { uuid: item.uuid })
    // return Promise.resolve(true);
    return doesThisChangeAnything(item, itemsByUuid)
  }
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
  }, itemHandler)
    .then(() => {
      log.debug('Done verifying items', {
        user: credentials.name,
        todo: todo,
        verified: verified,
        total: total
      });
    });
}

function preload(credentials) {
  const __user = credentials.name;
  log.debug('preload items', {
    user: __user
  });
  const opts = {
    filter: {
      __user: __user
    }
  };
  const itemsByUuid = {};

  function itemHandler(item) {
    itemsByUuid[item.uuid] = itemsByUuid[item.uuid] || []
    itemsByUuid[item.uuid].push(item)
    return Promise.resolve(true);
  }

  return store.impl.pg.load(opts, itemHandler)
    .then((results) => {
      log.verbose('Preloaded results', results.length);
      log.verbose('Preloaded uuids', Object.keys(itemsByUuid).length);
      const total = Object.keys(itemsByUuid)
        .reduce((total, uuid) => total + itemsByUuid[uuid].length,
        0)
      log.verbose('Preloaded total', total);
      return itemsByUuid
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
  if (log) {
    return Promise.resolve(true);
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
