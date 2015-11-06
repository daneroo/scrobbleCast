'use strict';

// Pump redux to pouchdb

// dependencies - core-public-internal
var Promise = require('bluebird');
var _ = require('lodash');
var PouchDB = require('pouchdb');
var srcFile = require('./lib/source/file');
var delta = require('./lib/delta');
var ouch = require('./lib/ouch');

// globals
var allCredentials = require('./credentials.json');
// var db = new PouchDB('pouchdb');
// var db = new PouchDB('http://admin:supersecret@192.168.59.103:5984/scrobblecast');
var db = new PouchDB('http://admin:supersecret@cantor:5984/scrobblecast');

//  move to logging module (?loggly)
var log = console.error;

//  move to logging module (as Factory?)
function verboseErrorHandler(shouldRethrow) {
  return function errorHandler(error) {
    log('error', error);
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
        log('-=-= NOT DROPPING Database', info);
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
          // console.log('-doc:', JSON.stringify(d));
        });
        log('total_rows', response.total_rows);
        return response;
      });
  };
}

function addKey(item) {
  var key = [item.meta.__user, item.meta.__type, item.uuid].join('/');
  item._id = key;
}
// returns a fetched item, or passes the item, augmented with a key.
function create(item) {
  // ouch.normalize(item); // _id and meta
  addKey(item);

  // log('--create', item._id);

  // log('--fetching', item._id);
  return db.get(item._id)
    .then(function(doc) {
      // log('  --found:', [doc._id, doc._rev]);
      var merged = _.merge({}, doc, item);
      // log('  --merged', [merged._id, merged._rev]);
      return merged;
    })
    .catch(function(error) {
      log('  --new!', item._id);
      return item;
    });
}

//  create or update
function save(item) {
  // log('--saving', [item._id, item._rev]);
  return db.put(item)
    .then(function(doc) {
      item._rev = doc.rev;
      log('  --saved', [item._id, item._rev]);
      return item;
    })
    .catch(function(error) {
      log('error:doc', [item._id, item._rev],error);
      // throw (error);
    })
    .catch(verboseErrorHandler(true));
}

var lastStamp = null;

function progress(item) {
  var day = item.__stamp.substr(0,10);
  var logit = (day !== lastStamp);
  if (logit) {
    log('--iteration stamp:', [item.__user, item.__stamp]);
    lastStamp = day;
  }
}

function createAndUpdate(item) {
  log('createAndUpdate',item.uuid,item.meta.__changeCount);
  return create(item)
    .then(save);
}

var accsByUserByType = {};

function getAccumulator(item) {
  var __user = item.__user;
  var __type = item.__type;
  // log('getAccumulator', __user, __type);
  if (!accsByUserByType[__user]) {
    accsByUserByType[__user] = {};
  }
  if (!accsByUserByType[__user][__type]) {
    accsByUserByType[__user][__type] = new delta.AccumulatorByUuid();
  }
  return accsByUserByType[__user][__type];
}

function itemHandler(credentials, stamp, file, item) {
  progress(item);
  // var JoeRogan = '873e7420-042d-012e-f9a4-00163e1b201c';
  // if (item.podcast_uuid !== JoeRogan) {
  //   return;
  // }
  var accByUUID = getAccumulator(item);
  var changeCount = accByUUID.merge(item);
  if (!changeCount) {
    return false;
  }
  var acc = accByUUID.getAccumulator(item.uuid);
  return createAndUpdate(acc);
}

function restoreFileToCouch() {
  var extra = '';
  // var extra = 'noredux'; // to switch to noredux..
  return srcFile.iterator(extra, allCredentials, itemHandler)
    .then(function(counts) {
      Object.keys(counts).forEach(function(name) {
        var c = counts[name];
        log('--' + extra + '-- ' + name, ' |stamps|:' + c.stamp + ' |f|:' + c.file + ' |p|:' + c.part);
      });
    })
    .then(function() {
      return Promise.each(_.values(accsByUserByType), function(types) { // _users
        return Promise.each(_.values(types), function(accByUUID) {  // _type
          // log(' -accs', __user, __type, _.keys(accByUUID.accumulators).length);
          return Promise.each(_.values(accByUUID.accumulators), function(acc) { // uuid
            // log('  -acc', __user, __type, uuid, acc.meta);
            log('  -acc',acc.meta.__user,acc.meta.__type,acc.uuid);
            // Promise iterator!
            return createAndUpdate(acc);
          });
        });
      });
    });
}

resetDB()
  .then(restoreFileToCouch)
  .then(showAll())
  .catch(verboseErrorHandler(false));
