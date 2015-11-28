'use strict';


// file implementation (load only)

// dependencies - core-public-internal
// var fs = require('fs');
// var path = require('path');
// var mkdirp = require('mkdirp');
// var Promise = require('bluebird');
// var _ = require('lodash');
var log = require('../log');
var srcFile = require('../source/file');
// var sinkFile = require('../sink/file');

// Exported API
exports = module.exports = {
  // save: (item, opts) => {}, // returns (Promise)(status in insert,duplicate,error)
  // load: (opts, cb) => {} // foreach item, cb(item);
  load: load // foreach item, cb(item);
};

// opts: {prefix:(extra),filter:{__user,__type,__stamp:[start,end]}}
// cb:   (item,err) => Promise(item)
function load(opts, itemHandler) {
  opts = opts || {};
  itemHandler = itemHandler || defaultItemHandler;
  opts.prefix = opts.prefix || '';
  if (!opts.filter.__user) {
    return Promise.reject(new Error('file:load missing required filter.__user'));
  }
  return srcFile.iterator(opts.prefix, [{
      name: opts.filter.__user
    }], itemHandler, '**/*.json?(l)')
    .then(reportCounts);

}

function defaultItemHandler(credentials, stamp, file, item) {
  // log.verbose('Handled', item);
  return Promise.resolve(true);
}

function reportCounts(counts) {
  Object.keys(counts).forEach(function(name) {
    var c = counts[name];
    // log.debug('base:%s user:%s |stamps|:%s |f|:%s |p|:%s |ignored|:%s', extra, name, c.stamp, c.file, c.part, c.ignoredFiles);
    log.debug('|stamps|:%s |f|:%s |p|:%s |ignored|:%s', c.stamp, c.file, c.part, c.ignoredFiles);
  });
  return Promise.resolve(true);
}
