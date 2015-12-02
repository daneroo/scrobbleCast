'use strict';

// pg implementation (save only)

// dependencies - core-public-internal
var Promise = require('bluebird');
var _ = require('lodash');
var log = require('../log');
// these might be moved or exposed
// var [p]ouch = require('../[p]ouch');
var pchu = require('./pouch-utils');

// Exported API
exports = module.exports = {
  // load: (opts, handler) => {} // foreach item, cb(item);
  load: load,
  // save: (item, opts) => {}, // returns (Promise)(status in insert,duplicate,error)
  save: save,
  pchu:pchu, // temporary
  init: pchu.init, // setup the database pool, ddl...
  end: pchu.end
};

// return Promise.each(rows), but might better return map[Series]
function load(opts, itemHandler) {
  opts = opts || {};
  itemHandler = itemHandler || noop; //noop
  opts.prefix = opts.prefix || '';
  if (!opts.filter.__user) {
    return Promise.reject(new Error('file:load missing required opt filter.__user'));
  }
  return pchu.allDocs('select item from items where __user=$1 order by __user,__stamp,__type,uuid,__sourceType', [opts.filter.__user])
    .then(function(rows) {
      log.verbose('pg:load ', {
        rows: rows.length
      });

      // mapSeries?
      return Promise.each(rows,function(row) {
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
function save(item, opts) {
  // log.debug('pg:save saving item', item.__stamp);
  return checkThenSaveItem(item);
  // return saveButVerifyIfDuplicate(item);
}

//TODO(daneroo) Right now, if confirmIdentical is false, but key is present, return false, but should throw!

// implementations
function checkThenSaveItem(item) {
  return confirmIdentical(item)
    .then(isIdentical => {
      return isIdentical || saveItem(item);
    });
}

function saveButVerifyIfDuplicate(item) {
  return saveItem(item)
    .catch(function(err) {
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
    .then(function(rowCount) {
      if (rowCount !== 1) {
        console.log('insert rowCount', rowCount);
      }
    });
}

function confirmIdentical(item) {
  var keys = [item.__user, item.__stamp, item.__type, item.uuid, item.__sourceType];
  // (__user, __stamp, __type, uuid, __sourceType)
  var sql = 'select item from items where __user=$1 AND __stamp=$2 AND __type=$3 AND uuid=$4 AND __sourceType=$5';
  return pgu.query(sql, keys)
    .then(result => {
      if (result.length === 0 || !result[0].item) {
        return false;
      }
      var dbitem = result[0].item;
      var isIdentical = _.isEqual(item, dbitem);
      if (!isIdentical) {
        log('Failed duplicate check', keys.join('/'));
        log('-', item);
        log('+', dbitem);

      } else {
        // log('Checked that duplicate is identical', keys.join('/'));
      }
      return isIdentical;
    });
}
