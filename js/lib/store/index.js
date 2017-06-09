'use strict'

// Main Module file for store API and implementations
// -must consider a streaming save (bulk loading)
// -must accomodate a streaming read
// API: {save(opts):,load(opts):}
// load may implement filering, ordering, streaming

// dependencies - core-public-internal
// var fs = require('fs');
// var path = require('path');
// var mkdirp = require('mkdirp');
// var Promise = require('bluebird');
// var _ = require('lodash');
// var log = require('./log');
// var srcFile = require('./source/file');
// var sinkFile = require('./sink/file');
// var delta = require('./delta');

// Exported API
exports = module.exports = {
  // common

  // implentations
  impl: {
    iface: {
      save: (/* item, opts */) => { }, // returns (Promise)(status in insert,duplicate,error)
      load: (/* opts, cb */) => { } // foreach item, cb(item);
    },
    pg: require('./pg'),
    file: require('./file') // load only for now
  }
}
