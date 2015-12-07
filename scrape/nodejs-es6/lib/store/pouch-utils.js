'use strict';

// pg basics - setup pool, ddl, utility funcs

// dependencies - core-public-internal
var Promise = require('bluebird');
var _ = require('lodash');
var PouchDB = require('pouchdb');
var log = require('../log');

// Exported API
exports = module.exports = {
  init: init, // return Promise(bool?)
  end: end, // return Promise(bool?) ?anything to close?
  allDocs: allDocs, // (sql,values) => Promise
  get: get, // (sql,values) => Promise
  put: put, // (sql,values) => Promise
};

// global
var db = new PouchDB('pouchdb');
// var db = new PouchDB('http://admin:supersecret@docker:5984/scrobblecast');
// var db = new PouchDB('http://admin:supersecret@cantor:5984/scrobblecast');

//  design docs,.... resetDB?
function init() {
  // log.debug('pchu:init');
  return Promise.resolve(true);
}

function end() {
  log.debug('pchu:end');
  return Promise.resolve(true)
    .then(sync);
}

function sync() {
  log.debug('replicate to couch');
  return new Promise(function(resolve, reject) {
    PouchDB.sync(db, 'http://admin:supersecret@docker:5984/scrobblecast')
      .on('change', function(info) {
        // handle change
        log.debug('sync:chg', _.omit(info,'docs'));
      }).on('paused', function() {
        // replication paused (e.g. user went offline)
        log.debug('sync:paused');
      }).on('active', function() {
        // replicate resumed (e.g. user went back online)
        log.debug('sync:active');
      }).on('denied', function(info) {
        // a document failed to replicate, e.g. due to permissions
        log.debug('sync:denied', info);
      }).on('complete', function(info) {
        // handle complete
        log.debug('sync:complete', info);
        resolve(true);
      }).on('error', function(err) {
        // handle error
        log.debug('sync:err', err);
      });
  });

}

function allDocs(pfx) {
  log.debug('pchu:allDocs', {
    pfx: pfx
  });
  let opts = {
    include_docs: true
  };
  // allDocs({startkey: 'artist_', endkey: 'artist_\uffff'});
  if (pfx) {
    opts.startkey = pfx;
    opts.endkey = pfx + '\uffff';
  }
  return db.allDocs(opts);
  // return Promise.resolve(true);
}

function get(item) {
  // log.debug('pchu:get', JSON.stringify(item));
  const opts = {
    // conflicts:true,
    // revs:true
  };
  return db.get(item._id, opts)
    // .then((doc) => {
    //   log.debug('pchu:get rsp', JSON.stringify(doc));
    //   return doc;
    // })
    .catch(function(err) {
      if (err.status === 404) {
        return; // undefined, but not an exception
      } else {
        log.debug('pchu:get err', err);
        throw err;
      }
    });
}

function put(item) {
  // log.debug('pchu:put', JSON.stringify(item));
  return db.put(item).then((rsp) => {
    // log.debug('pchu:put rsp', JSON.stringify(rsp));
    return rsp;
  }).catch((err) => {
    // log.debug('pchu:put err', err);
    throw err;
  });
}
