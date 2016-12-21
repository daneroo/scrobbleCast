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
  return pchu.allDocs(opts.filter.__user)
    .then(function (rsp) {
      log.verbose('pouch:load ', _.omit(rsp, 'rows'));
      log.verbose('pouch:load %d', rsp.rows.length);

      // mapSeries?
      return Promise.each(rsp.rows, function (row) {
        // row. (id,key,value,doc)
        var item = denormalize(row.doc);
        // log.debug('-pg:load Calling handler with item.stamp:%s',item.__stamp);
        return itemHandler(item);
      });
    });

  function noop(/*item*/) {
    return Promise.resolve(true);
  }
}

// opts: {check:first?} => Promise(status), overwrite?
// cases - insert ok, insert failed but duplicate is verified,
function save(item /*, opts*/) {
  // log.debug('pg:save saving item', item.__stamp);
  return saveItem(item);
}

// Save each item : problem, how do we traverse keys in an ordered way?
function saveItem(item) {
  const nitem = normalize(item);
  return pchu.get(nitem)
    .then(dbitem => {
      if (dbitem) {
        var ditem = denormalize(dbitem);
        var isIdentical = _.isEqual(item, ditem);
        if (isIdentical) {
          // log.debug('Checked that duplicate is identical', nitem._id);
          return true;
        } else {
          log.warn('Failed duplicate check', nitem._id);
          log.debug('-', nitem);
          log.debug('+', dbitem);
        }

        // we are now in update
        nitem._rev = dbitem._rev;
      }
      return pchu.put(nitem)
        .then((rsp) => {
          if (rsp.ok === true) {
            return true;
          } else {
            return false; // or throw
          }
        })
        .catch((/*err*/) => {
          return false;
        });
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
// move any keys in meta to top level, remove ._id and ._rev
function denormalize(nitem) {
  var meta = nitem.meta || {};
  var item = _.merge(meta, _.omit(nitem, 'meta'));
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
  meta = _.merge({}, item.meta, meta);

  var rest = _.omit(item, metaFields);
  //preserve the order by inserting meta first, which also create a new object
  return _.merge({
    meta: meta
  }, rest);
}
