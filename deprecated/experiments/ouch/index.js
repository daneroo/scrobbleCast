'use strict'

// This is a wrapper meant to abstract the persistence tou CouchDB/PouchDB
// For now: we will only be using the pouchdb API. nano is another option..
// intended uses: store the delta representation fo podcasts/episode entities
// -setup
// given an item (Accumulator)
// -merge: load merge save
// further investigation and design must be done for bulk operations

// dependencies - core-public-internal
// var _ = require('lodash');

// usage new ouch(db)
exports = module.exports = {
  Ouch: Ouch,
  bulk: require('./bulk'),
  normalize: normalize
}

function Ouch (db) {
  this.db = db
}

Ouch.prototype.get = function (item) {
  item = normalize(item)
  return item
}

// get the item from database (if it exists), then merge in new values, then put it back in the db
Ouch.prototype.save = function (item) {
  item = normalize(item)

  return this.db.get(item._id)
    // .then(function(old_item))
    .then(function (item) {
      this.db.put(item)
    })
}

// TODO make this idempotent.
// TODO add some tests
// TODO move item stuff to own modul (class?)

// this function transforms __tags into meta attribute, and calculates the computed key (__id)
function normalize (item) {
  addKey(item)
  normalizeMeta(item)
  return item
}

// item.__id <= calculates the computed key
function addKey (item) {
  // with - or without stamp
  // var key = [item.__user, item.__stamp, item.__type, item.uuid].join('/');
  var key = [item.__user, item.__type, item.uuid].join('/')
  item._id = key
}

// make this safer to apply twice
function normalizeMeta (item) {
  item.meta = {};
  ['__type', '__sourceType', '__user', '__stamp'].forEach(function (key) {
    item.meta[key] = item[key]
    delete item[key]
  })
}
