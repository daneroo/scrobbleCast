"use strict";

// Pump redux to pouchdb

// dependencies - core-public-internal
var PouchDB = require('pouchdb');
var srcFile = require('./lib/source/file');
var ouch = require('./lib/ouch');

// globals
var allCredentials = require('./credentials.json');
var db;

function setupPouch() {
  // db = new PouchDB('pouchdb');
  db = new PouchDB('http://admin:supersecret@192.168.59.103:5984/scrobblecast');
  // return Promise.resolve(db);
  return db;
}

function verbose(msg, thing) {
  console.error(msg, thing);
}

function verboseErrorHandler(error) {
  verbose('error', error);
  throw (error);
}

// -write out each doc to stdout (deleteing _rev key which is not repeatable)
function showAll() {
  return function() {
    return db.allDocs({
        include_docs: true
      })
      .then(function(response) {
        response.rows.forEach(function(item) {
          var d = item.doc;
          delete d._rev;
          console.log('-doc:', JSON.stringify(d));
        });
        verbose('total_rows', response.total_rows);
        return response;
      });
  };
}

// returns a fetched item, or passes the item, augmented with a key.
function create(item) {
  ouch.normalize(item); // _id and meta

  // verbose('--fetching', item._id);
  return db.get(item._id)
    .then(function(doc) {
      // verbose('--found:', doc);
      return doc;
    })
    .catch(function(error) {
      // verbose('--new!', item._id);
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
    .catch(function(error) {
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
    .then(save);
}

setupPouch()
  .then(function() {
    // var extra = 'noredux';
    var extra = '';
    srcFile.iterator(extra, allCredentials, createAndUpdate)
      .then(function(counts) {
        Object.keys(counts).forEach(function(name) {
          var c = counts[name];
          verbose('--' + extra + '-- ' + name, ' |stamps|:' + c.stamp + ' |f|:' + c.file + ' |p|:' + c.part);
        });
      })
      .then(showAll());
  })
  .catch(verboseErrorHandler);
