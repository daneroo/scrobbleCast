'use strict';

// pg implementation (save only)

// dependencies - core-public-internal
var Promise = require('bluebird');
var _ = require('lodash');
var log = require('../log');
var utils = require('../utils');
// these might be moved or exposed
var pgu = require('./pg-utils');

// var sinkFile = require('../sink/file');

const DIGEST_ALGORITHM = 'sha256';

// Exported API
exports = module.exports = {
  digests: digests,
  getByDigest:getByDigest,
  // load: (opts, handler) => {} // foreach item, cb(item);
  load: load,
  // save: (item) => {}, // should return (Promise)(status in insert,duplicate,error)
  save: save,
  // saveByBatch(batchSize) // accumulates writes, must be flushed at end
  saveByBatch: saveByBatch,
  remove: remove,
  saveAll: saveAll,
  init: pgu.init, // setup the database pool, ddl...
  end: pgu.end
};

function digests() {
  const nmParams = {
    DIGEST_ALGORITHM: DIGEST_ALGORITHM
  }

  // watch camelcase for __sourcetype NOT __sourceType,
  // also ES6 templates use ${var}, helper can use {}, (), [], <>, //
  // __user, __type, uuid, __sourceType, __stamp
  const sql =
    `SELECT encode(digest(item::text, $[DIGEST_ALGORITHM]), 'hex') as digest
    FROM items
    ORDER BY __stamp desc,digest
    --LIMIT 10000`;

  return pgu.db.any(sql, nmParams)
    .then(function (rows) {
      log.verbose('pg:digest ', { rows: rows.length });
      return rows.map(r => {
        return r.digest;
      });
    });

}

function getByDigest(digest) {
  const nmParams = {
    digest:digest,
    DIGEST_ALGORITHM: DIGEST_ALGORITHM
  }

  // watch camelcase for __sourcetype NOT __sourceType,
  // also ES6 templates use ${var}, helper can use {}, (), [], <>, //
  // __user, __type, uuid, __sourceType, __stamp
  const sql =
    `SELECT item
    FROM items
    WHERE $[digest]=encode(digest(item::text, $[DIGEST_ALGORITHM]), 'hex')`;

  return pgu.db.one(sql, nmParams)
    .then(function (row) {
      log.verbose('pg:getByDigest ', row);
      return row.item;
    });

}

// return Promise.each(rows)
// TODO(daneroo): but might better return map[Series] or spex, or streaming query
function load(opts, itemHandler) {
  opts = opts || {};
  itemHandler = itemHandler || noop; //noop
  opts.prefix = opts.prefix || '';
  if (!opts.filter.__user) {
    return Promise.reject(new Error('file:load missing required opt filter.__user'));
  }
  const sql = 'select item from items where __user=$1 order by __user,__stamp,__type,uuid,__sourceType';
  return pgu.db.any(sql, [opts.filter.__user])
    .then(function (rows) {
      log.verbose('pg:load ', { rows: rows.length });

      // mapSeries?
      return Promise.each(rows, function (row) {
        var item = row.item;
        // log.debug('-pg:load Calling handler with item.stamp:%s',item.__stamp);
        return itemHandler(item);
      });
    });

  function noop(/*item*/) {
    return Promise.resolve(true);
  }
}

// opts: {check:first?} => Promise(status)
// cases - insert ok, insert failed but duplicate is verified,
function save(item) {
  // log.verbose('pg:save saving item', { user: item.__user, stamp: item.__stamp });
  return checkThenSaveItem(item);
  // return saveButVerifyIfDuplicate(item);

  // speed benchamarks with ~135k items, redone with pgp
  // Conclusion full=> checkThenSaveItem, emtpy=>saveButVerifyIfDuplicate

  // checkThenSaveItem:full          162 seconds : sum ok
  // checkThenSaveItem:empty         423 seconds : sum ok
  // saveButVerifyIfDuplicate:full   266 seconds : sum ok
  // saveButVerifyIfDuplicate:empty  165 seconds : sum ok
  // saveButVerifyIfDuplicate:full   264 seconds : sum ok
}

// return a function to be used in place of save
// accumulates items for writing
// the returned function has a .flush property, which must be called at end
// e.g.
// let saver = saveByBatch(3)
// saver(item1); saver(item2); saver(item3); saver(item4);
// saver.flush(); // saves the pending items in accumulator
function saveByBatch(batchSize) {
  // default batchSize
  batchSize = batchSize || 1000;
  // speed benchamarks with ~135k items, redone with helpers.insert (multi)
  // batch=2 insert:empty     85 seconds : sum ok
  // batch=10 insert:empty    55 seconds : sum ok
  // batch=100 insert:empty   52 seconds : sum ok
  // batch=100 insert:empty   52 seconds : sum ok
  // batch=1000 insert:empty  38 seconds : sum ok
  // batch=10000 insert:empty 41 seconds : sum ok

  // batch=1000 insert,each.save:half  111 seconds : sum ok
  // batch=1000 insert,each.save:half  113 seconds : sum ok

  // batch=1000 insert,each.save:full  179 seconds : sum ok

  // this is the saved item accumulator
  let tosave = [];
  const flush = () => {
    // log.verbose('-flush', tosave.length);
    return saveAll(tosave)
      .then((results) => {
        tosave = [];
        return results;
      });
  }
  const saver = (item) => {
    tosave.push(item);
    if (tosave.length >= batchSize) {
      return flush();
    }
    return Promise.resolve(true);
  };

  // add the flush function to the returned
  saver.flush = () => {
    log.verbose('+last.flush called', tosave.length);
    return flush();
  }
  return saver;
}

// TODO(daneroo): delete by digest
//   OK for now as these 5 fields are a primary key
function remove(item) {
  const nmParams = pgu.getNamedParametersForItem(item);
  delete nmParams.item;

  // watch camelcase for __sourcetype NOT __sourceType,
  // also ES6 templates use ${var}, helper can use {}, (), [], <>, //
  const sql =
    `DELETE from items WHERE
    __user=$[__user] AND __stamp=$[__stamp]
    AND __type=$[__type] AND uuid=$[uuid]
    AND __sourcetype=$[__sourcetype]`;

  log.verbose('pg:remove deleting item', nmParams);

  // uses db.result to assert result.rowCount==1
  return pgu.db.result(sql, nmParams)
    .then(function (result) {
      if (result.rowCount !== 1) {
        log.warn('delete rowCount!=1', result);
        log.warn('delete rowCount!=1', nmParams);
      }
    });
}

// TODO(daneroo): figure out promised return value
function saveAll(items) {
  if (items.length === 0) {
    return Promise.resolve(true);
  }
  // Bruteforce implementation:  items.each save!
  // return Promise.each(items, (item) => save(item));

  // TODO(daneroo): precede with filtering not present by hash!
  // which would turn this into sync!
  // select digest from items where digest in [digest_0,...digest_batchsize]

  return pgu.db.none(pgu.insertSQL(items))
    .catch((error) => {
      if (error.message.startsWith('duplicate key')) {
        // log.verbose('at least one duplicate');
        // at least one duplicate, means the entire statement failed!
        // fall back to iterating on each item.save
        // adjust return value on success
        return Promise.each(items, (item) => save(item))
          .then(() => true);

      } else {
        log.verbose('insert error', error);
        throw error;
      }
    });


}

//TODO(daneroo) Right now, if confirmIdentical is false, but key is present, return false, but should throw!
// implementations
function checkThenSaveItem(item) {
  return confirmIdenticalByDigest(item)
    .then(isIdentical => {
      return isIdentical || confirmIdentical(item);
    })
    .then(isIdentical => {
      return isIdentical || saveItem(item);
    });
}

// Currently not used: commented for eslint
// function saveButVerifyIfDuplicate(item) {
//   return saveItem(item)
//     .catch(function (err) {
//       // todo check that values are equal...
//       if (err.message.startsWith('duplicate key')) {
//         return confirmIdentical(item);
//       } else {
//         throw err;
//       }
//     });
// }

// Save each item : problem, how do we traverse keys in an ordered way?
function saveItem(item) {
  return pgu.db.none(pgu.insertSQL(item));
}

function confirmIdentical(item) {
  const nmParams = pgu.getNamedParametersForItem(item);
  delete nmParams.item;

  // watch camelcase for __sourcetype NOT __sourceType,
  // also ES6 templates use ${var}, helper can use {}, (), [], <>, //
  const sql =
    `SELECT item FROM items
    WHERE __user=$[__user] AND __stamp=$[__stamp]
    AND __type=$[__type] AND uuid=$[uuid]
    AND __sourcetype=$[__sourcetype]`;

  return pgu.db.oneOrNone(sql, nmParams)
    .then(result => {
      if (result === null || !result.item) {
        return false;
      }
      var dbitem = result.item;
      var isIdentical = _.isEqual(item, dbitem);
      if (!isIdentical) {
        let vals = Object.keys(nmParams).map(k => nmParams[k]);
        log.verbose('Failed duplicate check', vals.join('/'));
        log.verbose('-', item);
        log.verbose('+', dbitem);
      } else {
        // let vals = Object.keys(nmParams).map(k => nmParams[k]);
        // log.verbose('Checked that item is identical', vals.join('/'));
      }
      return isIdentical;
    });
}

// This checks if the item selected by key exists has the proper digest
// it fails if the keey lookup succeds, but the digest is wrong
// TODO(daneroo): should probably throw if the key exists, but the digest is wrong
function confirmIdenticalByDigest(item) {
  const digest = utils.digest(JSON.stringify(item), DIGEST_ALGORITHM, false);

  const nmParams = pgu.getNamedParametersForItem(item);
  delete nmParams.item;
  nmParams.DIGEST_ALGORITHM = DIGEST_ALGORITHM;

  // watch camelcase for __sourcetype NOT __sourceType,
  // also ES6 templates use ${var}, helper can use {}, (), [], <>, //
  const sql =
    `SELECT encode(digest(item::text, $[DIGEST_ALGORITHM]), \'hex\') as digest
    FROM items
    WHERE __user=$[__user] AND __stamp=$[__stamp]
    AND __type=$[__type] AND uuid=$[uuid]
    AND __sourcetype=$[__sourcetype]`;

  return pgu.db.oneOrNone(sql, nmParams)
    .then(result => {
      if (result === null || !result.digest) {
        return false;
      }
      var dbdigest = result.digest;
      var isIdentical = digest === dbdigest;
      if (!isIdentical) {
        // TODO(daneroo): should probably throw if the key exists, but the digest is wrong
        let vals = Object.keys(nmParams).map(k => nmParams[k]);
        log.verbose('Failed duplicate digest check', vals.join('/'));
        log.verbose('-', digest);
        log.verbose('+', dbdigest);
      } else {
        // let vals = Object.keys(nmParams).map(k=>nmParams[k]);
        // log.verbose('Checked that digest is identical', vals.join('/'), digest);
      }
      return isIdentical;
    });
}
