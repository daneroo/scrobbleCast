"use strict";

// Pump redux to pouchdb

// dependencies - core-public-internal
var path = require('path');
var utils = require('./lib/utils');
var Promise = require('bluebird');
var PouchDB = require('pouchdb');
var srcFile = require('./lib/source/file');

var db = new PouchDB('pouchdb');

function showAll(msg) {
  return function() {
    return db.allDocs({
        include_docs: true
      })
      .then(function(response) {
        response.rows.forEach(function(item) {
          var d = item.doc;
          console.log(JSON.stringify({id:d._id,r:d._rev,t:d.item.title}));
        });
        console.log(msg,'total_rows',response.total_rows);
        return response;
      });
  };
}

function create(item) {
  // with - or without stamp
  // var key = [item.__user, item.__stamp, item.__type, item.uuid].join('/');
  var key = [item.__user, item.__type, item.uuid].join('/');
  item = {item:item};
  item._id = key;
  return db.get(key)
    .catch(function(error) {
      return item;
    });
}

function save(doc) {
  console.log('--saving', doc._id);
  return db.put(doc)
  .then(function(doc){
    return doc;
  })
  .catch(function(error){
    console.log('error',error);
  });
}

function createAndUpdate(item) {
  return create(item)
    .then(save);
}

// globals
var allCredentials = require('./credentials.json');

utils.serialPromiseChainMap(allCredentials, function(credentials) {
  utils.logStamp('Starting job for ' + credentials.name);

  // var basepath = path.join(srcFile.dataDirname, 'redux');
  var basepath = srcFile.dataDirname;

  return srcFile.findByUserStamp(credentials.name, basepath)
    .then(function(stamps) {
      utils.logStamp('Starting:redux for ' + credentials.name);
      console.log('-|stamps|', stamps.length);

      var partCount = 0;
      var fileCount = 0;

      // should have a version without aggregation
      return utils.serialPromiseChainMap(stamps, function(stamp) {
          console.log('--iteration stamp:', credentials.name, stamp);
          return srcFile.find(path.join('byUserStamp', credentials.name, stamp, '**/*.json'))
            .then(function(files) {

              return Promise.map(files, function(file) {

                console.log('---file:', file);
                var items = srcFile.loadJSON(file);

                fileCount++;
                return Promise.map(items, function(item) {
                  partCount++;
                  return createAndUpdate(item);
                },{concurrency: 1});

              },{concurrency: 1});
            });
        })
        .then(function(dontCare) {
          console.log('Done:redux[%s] |f|: %d  |p|: %d', credentials.name, fileCount, partCount);
          utils.logStamp('Done:redux[' + credentials.name + '] |f|:' + fileCount + ' |p|:' + partCount);
          return stamps;
        });

    })
    .catch(function(error) {
      console.error('Error:Dedup', error);
      utils.logStamp('Error:Dedup ' + error);
    });
})
.then(showAll('after'));
