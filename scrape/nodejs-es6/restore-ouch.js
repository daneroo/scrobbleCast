"use strict";

// Pump redux to pouchdb

// dependencies - core-public-internal
var _ = require('lodash');
var srcFile = require('./lib/source/file');
var ouch = require('./lib/ouch');

// var db = new ouch.pouch('pouchdb');
var db = new ouch.pouch('http://admin:supersecret@192.168.59.103:5984/scrobblecast');
var ouchdb = new ouch.Ouch(new ouch.pouch('pouchdb'));

// globals
var allCredentials = require('./credentials.json');

var rr = 0;

function mergaAndSave(credentials, stamp, file, item) {
  if (rr > 1) {
    // throw new Error('Early termination');
    return;
  }
  item = nu(rr++);

  logStamp(item);

  item = ouch.normalize(item);
  verbose('save:item', [item._id, item.played_up_to]);
  return db.get(item._id)
    .catch(function(error) {
      console.log('error', error);
      return item;
    })
    .then(function(doc) {
      console.log('got', doc._id, doc._rev);
      return _.merge({}, doc, item);
    })
    .then(function(mergedItem) {
      delete mergedItem.is_deleted;
      return db.put(mergedItem);
    })
    .then(function(response) {
      console.log('saved', response);
    });
}

function nu(idx) {
  return [{
    "__type": "episode",
    "__sourceType": "02-podcasts",
    "__user": "stephane",
    "__stamp": "2015-01-30T23:00:00Z",
    "podcast_uuid": "05ccf3c0-...",
    "uuid": "5a03cdd0-...",
    "url": "http://blablabla",
    "title": "274: Twitter ...",
    "played_up_to": 0,
    "is_deleted": 0,
    "starred": 0,
    "is_video": false
  }, {
    "__type": "episode",
    "__sourceType": "02-podcasts",
    "__user": "stephane",
    "__stamp": "2015-01-30T23:00:00Z",
    "podcast_uuid": "05ccf3c0-...",
    "uuid": "5a03cdd0-...",
    "url": "http://blablabla",
    "title": "274: Twitter ...",
    "played_up_to": 1234,
    // "is_deleted": 0,
    "starred": 0,
    "is_video": false
  }][idx];
}

function showAll() {
  return db.allDocs({
      include_docs: true
    })
    .then(function(response) {
      response.rows.forEach(function(item) {
        var d = item.doc;
        delete d._rev;
        // console.log('-doc:', JSON.stringify(d));
        console.log('-doc:', d);
      });
      verbose('total_rows', response.total_rows);
      return response;
    });
}

function showCounts(counts) {
  Object.keys(counts).forEach(function(name) {
    var c = counts[name];
    verbose('---- ' + name, ' |stamps|:' + c.stamp + ' |f|:' + c.file + ' |p|:' + c.part);
  });
}

var lastStamp = null;

function logStamp(item) {
  var logit = (item.__stamp !== lastStamp);
  if (logit) {
    verbose('--iteration stamp:', [item.__user, item.__stamp]);
    lastStamp = item.__stamp;
  }
}

function verbose(msg, thing) {
  console.error(msg, thing);
}

var extra = '';
srcFile.iterator(extra, allCredentials, mergaAndSave)
  .then(showCounts)
  .then(showAll)
  .catch(function(error) {
    console.log('error', error);
  });
