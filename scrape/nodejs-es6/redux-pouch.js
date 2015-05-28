"use strict";

// Pump redux to pouchdb

// dependencies - core-public-internal
var path = require('path');
var util = require('util');
var utils = require('./lib/utils');
var Promise = require('bluebird');
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
    .catch(verboseErrorHandler);
}

function createAndUpdate(item) {
  return create(item)
    .then(save);
}

utils.serialPromiseChainMap(allCredentials, function(credentials) {
    verbose('Starting job: ', credentials.name);

    // var basepath = path.join(srcFile.dataDirname, 'redux');
    var basepath = srcFile.dataDirname;

    return srcFile.findByUserStamp(credentials.name, basepath)
      .then(function(stamps) {
        verbose('-|stamps|', stamps.length);

        var partCount = 0;
        var fileCount = 0;

        // should have a version without aggregation
        return utils.serialPromiseChainMap(stamps, function(stamp) {
            verbose('--iteration stamp:', [credentials.name, stamp]);
            return srcFile.find(path.join('byUserStamp', credentials.name, stamp, '**/*.json'))
              .then(function(files) {

                return Promise.map(files, function(file) {

                  // verbose('---file:', file);
                  var items = srcFile.loadJSON(file);

                  fileCount++;
                  return Promise.map(items, function(item) {
                    partCount++;
                    return createAndUpdate(item);
                  }, {
                    concurrency: 1
                  });

                }, {
                  concurrency: 1
                });
              });
          })
          .then(function(dontCare) {
            verbose('Done job:', util.format('%s |f|: %d  |p|: %d', credentials.name, fileCount, partCount));
            return stamps;
          });

      })
      .catch(verboseErrorHandler);
  })
  .then(showAll());
