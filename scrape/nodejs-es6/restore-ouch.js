"use strict";

// Pump redux to pouchdb

// dependencies - core-public-internal
var _ = require('lodash');
var PouchDB = require('pouchdb');
var srcFile = require('./lib/source/file');
var ouch = require('./lib/ouch');

// globals
var allCredentials = require('./credentials.json');
var db = new PouchDB('pouchdb');
// var db = new PouchDB('http://admin:supersecret@192.168.59.103:5984/scrobblecast');
// var db = new PouchDB('http://admin:supersecret@cantor:5984/scrobblecast');

//  move to logging module (?loggly)
function verbose(msg, thing) {
  console.error(msg, thing);
}

//  move to logging module (as Factory?)
function verboseErrorHandler(shouldRethrow) {
  return function errorHandler(error) {
    verbose('error', error);
    if (shouldRethrow) {
      throw (error);
    }
  };
}

// TODO reset DB? db.destry.then db.create
function resetDB(dropAndCreate) {
  if (!dropAndCreate) {
    return db.info()
      .then(function(info) {
        verbose('-=-= NOT DROPPING Database', info);
      });
  }
  // else drop and create : maybe not on couchDB (bulk delete all instead)
  return db.destroy().then(function() {
      // success
    })
    .then(function() {
      // recreate the database ?? how will that affect replication ? recreate as admin, delegate to normal user..
    })
    .catch(verboseErrorHandler(true));
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
      verbose('--found:', doc);
      var merged = _.merge({}, doc, item);
      return merged;
    })
    .catch(function(error) {
      verbose('--new!', item._id);
      return item;
    });
}

//  create or update
function save(item) {
  verbose('--saving', item._id);
  return db.put(item)
    .then(function(doc) {
      verbose('--saved', doc);
      item._rv = doc._rev;
      return item;
    })
    .catch(function(error) {
      verbose('error:doc', [item._id,item._rev]);
      throw (error);
    })
    .catch(verboseErrorHandler(true));
}

var lastStamp = null;

function progress(item) {
  var logit = (item.__stamp !== lastStamp);
  if (logit) {
    verbose('--iteration stamp:', [item.__user, item.__stamp]);
    lastStamp = item.__stamp;
  }
}

function bulkSave(batchSize) {
  // save | bulk save[1] or bulk
  if (!batchSize) {
    return save;
  }
  if (batchSize === 1) {
    return function(item) {
      db.bulkDocs([item]);
    };
  }
  // else
  var batch = [];
  return function(item) {
    if (batch.length < batchSize) {
      batch.push(item);
      return 'batched';
    }
    return db.bulkDocs(batch)
      .then(function(result) {
        console.log('create:bulk:', result);
        batch = [];
      });
  };
}

function createAndUpdate(credentials, stamp, file, item) {
  progress(item);
  return create(item)
    .then(save);
    // .then(bulkSave(0));
    // .then(bulkSave(0));

}

function restoreFileToCouch() {
  var extra = '';
  // var extra = 'noredux'; // to switch to noredux..
  return srcFile.iterator(extra, allCredentials, createAndUpdate)
    .then(function(counts) {
      Object.keys(counts).forEach(function(name) {
        var c = counts[name];
        verbose('--' + extra + '-- ' + name, ' |stamps|:' + c.stamp + ' |f|:' + c.file + ' |p|:' + c.part);
      });
    });
}

resetDB()
  .then(restoreFileToCouch)
  .then(showAll())
  .catch(verboseErrorHandler(false));
