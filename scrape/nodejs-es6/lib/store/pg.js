'use strict';

// pg implementation (save only)

// dependencies - core-public-internal
// var _ = require('lodash');
var log = require('../log');
// these might be moved or exposed
var pgu = require('./pg-utils');

// var sinkFile = require('../sink/file');

// Exported API
exports = module.exports = {
  // save: (item, opts) => {}, // returns (Promise)(status in insert,duplicate,error)
  // load: (opts, cb) => {} // foreach item, cb(item);
  // save: save,
  pgu: pgu, // temporary
  init: pgu.init, // setup the database pool, ddl...
  end: pgu.end
};

// opts: {check:first?} => Promise(status)
function save(item, opts) {
  log.debug('pg:save saving item', item);
  return Promise.resolve(true);
}
