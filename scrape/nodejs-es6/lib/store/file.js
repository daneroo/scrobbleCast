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
  itemHandler = itemHandler || defaultItemHandler();
  opts.prefix = opts.prefix || '';
  if (!opts.filter.__user) {
    return Promise.reject(new Error('file:load missing required filter.__user'));
  }
  return srcFile.iterator(opts.prefix, [{
      name: opts.filter.__user
    }], wrappedHandler(opts, itemHandler), '**/*.json?(l)')
    .then(reportCounts);

}

function defaultItemHandler() {
  return (item) => {
    // log.verbose('Handled', item);
    return Promise.resolve(true);
  };
}

// call any assertions, before the actual handler
// -massage the arguments into old form of srcFile.iterator's handler
function wrappedHandler(opts, itemHandler) {
  const assert = combineAssertions(opts);
  return function(credentials, stamp, file, item) {
    // log.debug('-file:load Calling handler with item.stamp:%s', item.__stamp);
    assert(item)
    return itemHandler(item);
  };
}

// these are synchronous for now
function combineAssertions(opts) {
  const parts = [];
  if (opts && opts.assert) {
    if (opts.assert.progress) {
      parts.push(progress());
    }
    if (opts.assert.stampOrder) {
      parts.push(checkStampOrdering());
    }
    if (opts.assert.singleUser) {
      parts.push(singleUser());
    }
  }

  // return the handler
  return (item) => {
    parts.forEach((part) => {
      part(item);
    });
  };
}

// function with bound local isolated scope

// by time, or count,...
function progress() {
  // boud scope variables
  var soFar = 0;
  var start = +new Date();

  // the function we are returning, bound to local variables
  return (item) => {
    soFar++;
    // if (elapsed > 2 ) {
    if (soFar % 2000 === 0) {
      var elapsed = (+new Date() - start) / 1000;
      var rate = (soFar / elapsed).toFixed(0) + 'r/s';
      // log('Progress %s: %s', soFar, elapsed, rate);
      log.verbose('Progress: %s %s %s', rate, item.__user, item.__stamp);
      // soFar = 0;
      // start = +new Date();
    }
  };
}

function checkStampOrdering() {
  var maxStamp = '1970-01-01T00:00:00Z'; // to track increasing'ness
  return (item) => {
    var stamp = item.__stamp;
    log.debug('Checking stamp ordering: %s >=? %s', item.__stamp,maxStamp);
    if (stamp < maxStamp) {
      log.error('Item stamp not increasing: %s > %j', maxStamp, item);
      throw new Error('Item stamp not increasing');
    }
    maxStamp = stamp;
  };
}

function singleUser() {

  var user; // used to validate that all items have same user
  // validates that we are always called with a single user, throws on violation
  return (item) => {
    // validate that all items are for same user
    log.debug('Checking users in loader: %s =?= %s', user, item.__user);
    if (!user) {
      user = item.__user;
    } else if (user !== item.__user) {
      log.error('Mixing users in loader: %s != %s', user, item.__user);
      throw new Error('Mixing users in loader');
    }
  };
}

function reportCounts(counts) {
  Object.keys(counts).forEach(function(name) {
    var c = counts[name];
    // log.debug('base:%s user:%s |stamps|:%s |f|:%s |p|:%s |ignored|:%s', extra, name, c.stamp, c.file, c.part, c.ignoredFiles);
    log.debug('|stamps|:%s |f|:%s |p|:%s |ignored|:%s', c.stamp, c.file, c.part, c.ignoredFiles);
  });
  return Promise.resolve(true);
}
