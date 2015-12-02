'use strict';

// pg basics - setup pool, ddl, utility funcs

// dependencies - core-public-internal
var Promise = require('bluebird');
// var _ = require('lodash');
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
  log.debug('pchu:init');
  return Promise.resolve(true);
}

function end() {
  log.debug('pchu:end');
  return Promise.resolve(true);
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
  log.debug('pchu:get', JSON.stringify(item));
  const opts = {
    // conflicts:true,
    // revs:true
  };
  return db.get(item._id, opts).then((doc) => {
    log.debug('pchu:get rsp', JSON.stringify(doc));
    return doc;
  }).catch(function(err) {
    log.debug('pchu:get err', err);
    if (err.status === 404) {
      return; // undefined, but not an exception
    } else {
      throw err;
    }
  });
}

function put(item) {
  log.debug('pchu:put', JSON.stringify(item));
  return db.put(item).then((response) => {
    log.debug('pchu:put rsp', JSON.stringify(response));
  }).catch((err) => {
    log.debug('pchu:put err', err);
  });
}
