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
  // result full=> checkThenSaveItem, emtpy=>saveButVerifyIfDuplicate

  // checkThenSaveItem:full          200 seconds : sum ok
  // checkThenSaveItem:full          174 seconds : sum ok
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

const columns = [
  '__user',
  '__stamp',
  '__type',
  'uuid',
  // no camelCase! __sourceType -> __sourcetype
  '__sourcetype',
  'item'
];
const columnSet = new pgu.helpers.ColumnSet(columns, { table: 'items' });

// TODO(daneroo): figure out promised return value
function saveAll(items) {
  if (items.length === 0) {
    return Promise.resolve(true);
  }
  return Promise.each(items, (item) => save(item));

  function getFields(item) {
    return {
      __user: item.__user,
      __stamp: item.__stamp,
      __type: item.__type,
      uuid: item.uuid,
      // no camelCase! __sourceType -> __sourcetype
      __sourcetype: item.__sourceType,
      item: item
    };
  }


  // speed benchamarks with ~135k items, redone with helpers.insert (single)
  // insert,confirmIdenticalOnDuplicate:empty  134 seconds : sum ok
  // insert,confirmIdenticalOnDuplicate:full   260 seconds : sum ok

  let single = false;
  if (single) {
    return Promise.each(items, (item) => {
      // Column details can be taken from the data object:

      let fields = getFields(item);

      // let sql = pgu.helpers.insert(fields, null, 'items');
      let sql = pgu.helpers.insert(fields, columnSet);

      // log.verbose('sql', sql);
      return pgu.db.none(sql)
        // .then(() => {
        //   // log.verbose('insert ok');
        // })
        .catch((error) => {
          if (error.message.startsWith('duplicate key')) {
            // log.verbose('duplicate')
            //  checkThenSaveItem would be same...
            return confirmIdentical(item);
          } else {
            log.verbose('insert error', error);
            throw error;
          }
        });
    });
  }

  // speed benchamarks with ~135k items, redone with helpers.insert (multi)
  // batch=2 insert,each.save:empty     85 seconds : sum ok
  // batch=10 insert,each.save:empty    55 seconds : sum ok
  // batch=100 insert,each.save:empty   52 seconds : sum ok
  // batch=100 insert,each.save:empty   52 seconds : sum ok
  // batch=1000 insert,each.save:empty  38 seconds : sum ok
  // batch=10000 insert,each.save:empty  41 seconds : sum ok

  // batch=1000 insert,each.save:half  111 seconds : sum ok
  // batch=1000 insert,each.save:half  113 seconds : sum ok

  // TODO(daneroo): precede with filtering not present by hash!
  // which would turn this into sync!
  // select digest from items where digest in [digest_0,...digest_batchsize]

  let multiple = true;
  if (multiple) {
    // log.verbose('multi', items.length);

    let fields = items.map(getFields);
    // log.verbose('multi.fields', fields);
    let sql = pgu.helpers.insert(fields, columnSet);
    // log.verbose('multi.sql', sql);
    return pgu.db.none(sql)
      // .then(() => {
      //   // log.verbose('insert ok');
      // })
      .catch((error) => {
        if (error.message.startsWith('duplicate key')) {
          // log.verbose('at least one duplicate');
          return Promise.each(items, (item) => save(item))
            .then(() => {
              // log.verbose('re-inserted on by one, done');
              return true;
            });
        } else {
          log.verbose('insert error', error);
          throw error;
        }
      });

  }

}

//TODO(daneroo) Right now, if confirmIdentical is false, but key is present, return false, but should throw!
// implementations
function checkThenSaveItem(item) {
  // return confirmIdenticalByDigestCount(item)
  // return confirmIdentical(item)
  //   .then(isIdentical => {
  //     return isIdentical || saveItem(item);
  //   });
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
  function getFields(item) {
    return [item.__user, item.__stamp, item.__type, item.uuid, item.__sourceType, item];
  }

  var fields = getFields(item);
  // var key = fields.slice(0, -1).join('/');
  // console.log('-save', key);

  return pgu.insert('INSERT into items(__user,__stamp,__type,uuid,__sourceType,item) VALUES($1,$2,$3,$4,$5,$6)', fields)
    .then(function (rowCount) {
      if (rowCount !== 1) {
        // console.log('insert rowCount', rowCount);
      }
    });
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
