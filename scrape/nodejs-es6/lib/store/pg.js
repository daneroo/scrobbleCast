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
  // load: (opts, handler) => {} // foreach item, cb(item);
  load: load,
  // save: (item, opts) => {}, // returns (Promise)(status in insert,duplicate,error)
  save: save,
  remove: remove,
  saveAll: saveAll,
  init: pgu.init, // setup the database pool, ddl...
  end: pgu.end
};

// return Promise.each(rows), but might better return map[Series]
function load(opts, itemHandler) {
  opts = opts || {};
  itemHandler = itemHandler || noop; //noop
  opts.prefix = opts.prefix || '';
  if (!opts.filter.__user) {
    return Promise.reject(new Error('file:load missing required opt filter.__user'));
  }
  return pgu.query('select item from items where __user=$1 order by __user,__stamp,__type,uuid,__sourceType', [opts.filter.__user])
    .then(function (rows) {
      // log.verbose('pg:load ', {
      //   rows: rows.length
      // });

      // mapSeries?
      return Promise.each(rows, function (row) {
        var item = row.item;
        // log.debug('-pg:load Calling handler with item.stamp:%s',item.__stamp);
        return itemHandler(item);
      });
    });

  function noop(item) {
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

function remove(item) {
  function getFields(item) {
    return [item.__user, item.__stamp, item.__type, item.uuid, item.__sourceType];
  }
  var fields = getFields(item);
  log.debug('pg:remove deleting item', fields);

  return pgu.insert('DELETE from items where __user=$1 AND __stamp=$2 AND __type=$3 AND uuid=$4 AND __sourceType=$5', fields)
    .then(function (rowCount) {
      if (rowCount !== 1) {
        console.log('delete rowCount!=1', rowCount);
      }
    });
}

// TODO(daneroo): figure out return promised return value
function saveAll(items) {
  if (items.length === 0) {
    return Promise.resolve(true);
  }
  // Bruteforce implementation:  items.each save!
  // return Promise.each(items, (item) => save(item));

  // speed benchamarks with ~135k items, redone with helpers.insert (multi)
  // batch=2 insert,each.save:empty     85 seconds : sum ok
  // batch=10 insert,each.save:empty    55 seconds : sum ok
  // batch=100 insert,each.save:empty   52 seconds : sum ok
  // batch=100 insert,each.save:empty   52 seconds : sum ok
  // batch=1000 insert,each.save:empty  38 seconds : sum ok
  // batch=10000 insert,each.save:empty  41 seconds : sum ok

  // batch=1000 insert,each.save:half  111 seconds : sum ok
  // batch=1000 insert,each.save:half  113 seconds : sum ok

  // batch=1000 insert,each.save:full  179 seconds : sum ok

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

function saveButVerifyIfDuplicate(item) {
  return saveItem(item)
    .catch(function (err) {
      // todo check that values are equal...
      if (err.message.startsWith('duplicate key')) {
        return confirmIdentical(item);
      } else {
        throw err;
      }
    });
}

// Save each item : problem, how do we traverse keys in an ordered way?
function saveItem(item) {
  return pgu.db.none(pgu.insertSQL(item));
}

function confirmIdentical(item) {
  var keys = [item.__user, item.__stamp, item.__type, item.uuid, item.__sourceType];
  var sql = 'select item from items where __user=$1 AND __stamp=$2 AND __type=$3 AND uuid=$4 AND __sourceType=$5';
  return pgu.query(sql, keys)
    .then(result => {
      if (result.length === 0 || !result[0].item) {
        return false;
      }
      var dbitem = result[0].item;
      var isIdentical = _.isEqual(item, dbitem);
      if (!isIdentical) {
        log.verbose('Failed duplicate check', keys.join('/'));
        log.verbose('-', item);
        log.verbose('+', dbitem);

      } else {
        // log.verbose('Checked that item is identical', keys.join('/'));
      }
      return isIdentical;
    });
}

// This checks if the item selected by key exists has the proper digest
// it fails if the keey lookup succeds, but the digest is wrong
// TODO(daneroo): should probably throw if the key exists, but the digest is wrong
function confirmIdenticalByDigest(item) {
  var digest = utils.digest(JSON.stringify(item), DIGEST_ALGORITHM, false);
  var keys = [DIGEST_ALGORITHM, item.__user, item.__stamp, item.__type, item.uuid, item.__sourceType];
  var sql = 'SELECT encode(digest(item::text, $1), \'hex\') as digest from items where __user=$2 AND __stamp=$3 AND __type=$4 AND uuid=$5 AND __sourceType=$6';

  return pgu.query(sql, keys)
    .then(result => {
      if (result.length === 0 || !result[0].digest) {
        return false;
      }
      var dbdigest = result[0].digest;
      var isIdentical = digest === dbdigest;
      if (!isIdentical) {
        // TODO(daneroo): should probabley throw if the key exists, but the digest is wrong
        log.verbose('Failed duplicate digest check', keys.join('/'));
        log.verbose('-', digest);
        log.verbose('+', dbdigest);
      } else {
        // log.verbose('Checked that digest is identical', keys.join('/'),digest);
      }
      return isIdentical;
    });
}
