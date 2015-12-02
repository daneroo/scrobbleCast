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

function end(){
  log.debug('pchu:end');
  return Promise.resolve(true);
}

function allDocs() {
  log.debug('pchu:allDocs');
  return db.allDocs({
    include_docs:true
  });
  // return Promise.resolve(true);
}

function get(){
  log.debug('pchu:get');
  return Promise.resolve(true);
}
function put(){
  log.debug('pchu:put');
  return Promise.resolve(true);
}
