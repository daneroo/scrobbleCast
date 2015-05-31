'use strict';

// dependencies - core-public-internal
var _ = require('lodash');

// usage new ouch(db)
exports = module.exports = {
  couch: require('./couch'),
  pouch: require('./pouch'),
  Ouch: Ouch,
  normalize: normalize
};

function Ouch(db) {
  this.db = db;
}

Ouch.prototype.get = function(item) {
  item = normalize(item);
}

// get the item from database (if it exists), then merge in new values, then put it back in the db
Ouch.prototype.save = function(item) {
  item = normalize(item);


  return this.db.get(item._id)
    // .then(function(old_item))
    .then(function(item) {
      this.db.put(item);
    });
};

// get the item from database (in case it already exists, and we need _rev)
function save(item) {
  return get(item)
    .then(put);
}

function fetch(item) {
  if (!item._id) {
    throw new Error('item without ._id');
  }
}

// TODO make this idempotent.
// TODO add some tests
// TODO move item stuff to own modul (class?)

// this function transforms __tags into meta attribute, and calculates the computed key (__id)
function normalize(item) {
  addKey(item);
  normalizeMeta(item);
  return item;
}

// item.__id <= calculates the computed key
function addKey(item) {
  // with - or without stamp
  // var key = [item.__user, item.__stamp, item.__type, item.uuid].join('/');
  var key = [item.__user, item.__type, item.uuid].join('/');
  item._id = key;
}

// make this safer to apply twice
function normalizeMeta(item) {
  item.meta = {};
  ['__type', '__sourceType', '__user', '__stamp'].forEach(function(key) {
    item.meta[key] = item[key];
    delete item[key];
  });
}
