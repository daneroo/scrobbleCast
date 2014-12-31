"use strict";

// Fetches and updates many documents

var Promise = require('bluebird');
var PouchDB = require('pouchdb');
var db = new PouchDB('pouchdb');

function showAll(msg) {
  return function() {
    return db.allDocs({
        include_docs: true
      })
      .then(function(response) {
        // console.log(msg, JSON.stringify(response, null, 2));
        response.rows.forEach(function(item) {
          console.log(msg, JSON.stringify(item.doc));

        });
        console.log(msg,'total_rows',response.total_rows);
        return response;
      });
  }
}

function create(episodeNum) {
  var key = 'episode-' + episodeNum;
  return db.get(key)
    .catch(function(error) {
      // console.log('--expected error');
      return {
        _id: key
      }
    })
}

function update(doc) {
  console.log('--updating', doc._id);
  doc.stamp = new Date();
  return db.put(doc);
}

function createAndUpdate(episodeNum) {
  return create(episodeNum)
    .then(update);
}

function updateSome() {
  var candidates = [42, 43, 44, 45, 46];
  var some = [];
  candidates.forEach(function(num) {
    if (Math.random() > 0.5) {
      some.push(num);
    }
  });
  return Promise.map(some, createAndUpdate);
}

Promise.resolve(42)
  .then(showAll('before'))
  .then(updateSome)
  .then(showAll('after'))
  .catch(function(error) {
    console.log('error', error);
  });

db.changes().on('change', function(change) {
  console.log('Ch-Ch-Changes', JSON.stringify(change));
});

// db.replicate.to('http://example.com/mydb');