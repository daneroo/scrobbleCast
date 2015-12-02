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
  pchu: pchu, // temporary
  test: test,
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
  // trasnform opts.filter.user into start/end keys
  return pchu.allDocs()
    .then(function(rows) {
      log.verbose('pg:load ', {
        rows: rows.length
      });

      // mapSeries?
      return Promise.each(rows, function(row) {
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

// prepare object for persistence in pouch
// this function transforms __tags into one meta attribute, and calculates the computed key (__id)
// returns a new object - leaves the original intact
function normalize(item) {
  // move meta fields
  var nitem = normalizeMeta(item);
  // add key
  // TODO(daneroo) mv _id to top, and move normalizeMeta here.
  nitem._id = getKey(item);
  return nitem;
}

// restores an item from pouch ito its original form
// move any keys in meta to top level, remove _id, (_.rev)
function denormalize(nitem) {
  var meta = nitem.meta ||{};
  var item = _.merge(meta,_.omit(nitem,'meta'));
  delete item._id;
  delete item._rev;
  return item;
}
const keyFields = ['__user', '__stamp', '__type', 'uuid', '__sourceType'];
const metaFields = keyFields.filter((k) => k.startsWith('__'));

function getKey(item) {
  const keyParts = keyFields.map((k) => item[k]);
  return keyParts.join('/');
}

// make this safer to apply twice
// non destructive, returns a new object
function normalizeMeta(item) {
  var meta = _.pick(item, metaFields);
  // merge over any pre-existing meta, for idempotence...
  var meta = _.merge({}, item.meta, meta);

  var rest = _.omit(item, metaFields);
  //preserve the order by inserting meta first, which also create a new object
  return _.merge({
    meta: meta
  }, rest);
}

function test() {
  var item = {
    "__type": "episode",
    "__sourceType": "03-new_releases",
    "__user": "daniel",
    "__stamp": "2015-12-02T20:10:00Z",
    "id": null,
    "uuid": "c2ebe410-77af-0133-2cee-6dc413d6d41d",
    "url": "http://fdlyr.co/d/changelog/cdn.5by5.tv/audio/broadcasts/changelog/2015/changelog-184.mp3",
    "published_at": "2015-11-28 03:00:00",
    "duration": "4918",
    "file_type": "audio/mp3",
    "title": "184: Discussing Vue.js and Personal Projects With Evan You",
    "podcast_id": 207672,
    "size": 79060959,
    "podcast_uuid": "70d13d50-9efe-0130-1b90-723c91aeae46",
    "playing_status": 2,
    "played_up_to": 1902,
    "is_deleted": false,
    "starred": false
  }

  console.log('item', item);

  var nitem = normalize(item);
  console.log('nitem', nitem);

  var ditem = denormalize(nitem);
  console.log('ditem', ditem);


}
