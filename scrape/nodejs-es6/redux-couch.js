"use strict";

// Pump redux to pouchdb

// dependencies - core-public-internal
var Promise = require('bluebird');
var couch = require('couch-db');
var srcFile = require('./lib/source/file');

// globals
var allCredentials = require('./credentials.json');
var db;
var _db;

function setupCouch() {
  // var nano = require('nano')('http://localhost:5984');
  return new Promise(function(resolve, reject) {
    var server = couch('http://admin:supersecret@192.168.59.103:5984');
    server.auth('admin', 'supersecret');

    /*var*/
    _db = server.database('scrobblecast');
    _db.destroy(function(err) {
      // create a new database
      if (err) {
        // that's fine; no need to abort
        // return reject(err);
      }
      _db.create(function(err) {
        if (err) {
          return reject(err);
        }

        db = {
          get: Promise.promisify(_db.fetch, _db),
          put: Promise.promisify(_db.save, _db),
          allDocs: Promise.promisify(_db.allDocs, _db)
        };

        // reject('Blanked DB');
        resolve(db);

      });
    });
  });
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
        if (response && response.rows) {
          response.rows.forEach(function(item) {
            var d = item.doc;
            delete d._rev;
            console.log('-doc:', JSON.stringify(d));
          });
        } else {
          console.log('empty?', response);
        }
        verbose('total_rows', response.total_rows);
        return response;
      });
  };
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
  // verbose('--fetching', item._id);
  return db.get(key)
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
  verbose('--saving', doc._id);
  return db.put(doc)
    .then(function(doc) {
      verbose('saved:doc', doc.__id);
      return doc;
    })
    .catch(function(error) {
      verbose('error:doc', doc.__id);
      throw (error);
    })
    .catch(verboseErrorHandler);
}

// for context logging
var lastStamp = null;
var batch = [];

function createAndUpdate(credentials, stamp, file, item) {
  var logit = (item.__stamp !== lastStamp);
  if (logit) {
    verbose('--iteration stamp:', [credentials.name, stamp]);
    lastStamp = stamp;
  }

  return create(item)
    // .then(function(item) {
    //   console.log('create:item:', item);
    //   return item;
    // })
    .then(function(item) {
      return new Promise(function(resolve, reject) {
        // _db.save(item._id, item, {batch:'ok'},function(err, result) {
        _db.bulkSave([item],function(err, result) {
          if (err) {
            return reject(err);
          }
          console.log('create:bulk:', result);
          return resolve(result);
        });

        // if (batch.length < 1000) {
        //   batch.push(item);
        //   return resolve('batched');
        // }

        // _db.bulkSave(batch, function(err, result) {
        //   batch = [];
        //   if (err) {
        //     reject(err);
        //   }
        //   console.log('create:bulk:', result);
        //   resolve(result);
        // });

      });
    });
  // return create(item)
  //   .then(save);
}

setupCouch()
  .then(function() {
    // throw ('Abort before you start');
  })
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
