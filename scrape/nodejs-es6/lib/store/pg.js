'use strict';

// pg implementation (save only)

// dependencies - core-public-internal
var _ = require('lodash');
var log = require('../log');
// these might be moved or exposed
var pgu = require('./pg-utils');

// var sinkFile = require('../sink/file');

// Exported API
exports = module.exports = {
  // save: (item, opts) => {}, // returns (Promise)(status in insert,duplicate,error)
  // load: (opts, cb) => {} // foreach item, cb(item);
  save: save,
  pgu: pgu, // temporary
  init: pgu.init, // setup the database pool, ddl...
  end: pgu.end
};

// opts: {check:first?} => Promise(status)
function save(item, opts) {
  // log.debug('pg:save saving item', item.__stamp);
  return checkThenSaveItem(item);
  // return saveItem(item);
}

// implementation
function checkThenSaveItem(item) {
  return confirmIdentical(item)
    .then(isIdentical => {
      return isIdentical || saveItem(item);
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
    })
    .catch(function(err) {
      // todo check that values are equal...
      if (err.message.startsWith('duplicate key')) {
        return confirmIdentical(item);
      } else {
        throw err;
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
