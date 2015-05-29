"use strict";

// Pump redux to pouchdb

// dependencies - core-public-internal
var PouchDB = require('pouchdb');
var srcFile = require('./lib/source/file');

// globals
var allCredentials = require('./credentials.json');
var db = new PouchDB('pouchdb');

function verbose(msg, thing) {
  console.error(msg, thing);
}

function verboseErrorHandler(error) {
  verbose('error', error);
  throw (error);
}

// returns a fetched item, or passes the item, augmented with a key.
function create(item) {
  // with - or without stamp
  // var key = [item.__user, item.__stamp, item.__type, item.uuid].join('/');
  var key = [item.__user, item.__type, item.uuid].join('/');

  // re-uasble obect transformation; (immutable ==> clone)
  // bury the meta keys in meta attribute, so as not to clash with couch restrictions on top-level keys ( ._anything)
  item.meta = {};
  ['__type', '__sourceType', '__user', '__stamp'].forEach(function(key) {
    item.meta[key] = item[key];
    delete item[key];
  });
  item._id = key;
  return db.get(key)
    .catch(function(error) {
      return item;
    });
}

//  create or update
function save(doc) {
  // verbose('--saving', doc._id);
  return db.put(doc)
    .then(function(doc) {
      return doc;
    })
    .catch(function(error){
      verbose('error:doc', doc.__id);
      throw (error);
    })
    .catch(verboseErrorHandler);
}

var lastStamp = null;

function createAndUpdate(credentials, stamp, file, item) {
  var logit = (item.__stamp !== lastStamp);
  if (logit) {
    verbose('--iteration stamp:', [credentials.name, stamp]);
    lastStamp = stamp;
  }
  return create(item)
    .then(save)
    .then(function(){
      if (logit) {
        verbose('-+iteration stamp:', [credentials.name, stamp]);
      }
    });
}

// var extra = 'noredux';
var extra = '';

srcFile.iterator(extra, allCredentials, createAndUpdate)
  .then(function(counts) {
    Object.keys(counts).forEach(function(name) {
      var c = counts[name];
      console.log('--' + extra + '-- ' + name + ' |stamps|:' + c.stamp + ' |f|:' + c.file + ' |p|:' + c.part);
    });
  });
