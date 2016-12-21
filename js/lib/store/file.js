'use strict';

// file implementation (load only)

// dependencies - core-public-internal
// var fs = require('fs');
var path = require('path');
// var mkdirp = require('mkdirp');
var Promise = require('bluebird');
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

// TODO filter:{__type,__stamp:[start,end]}
// opts: {
//     prefix: basepath || [base1,base2],
//     filter: { __user:required }
// }
// cb:   (item,err) => Promise(item)
function load(opts, itemHandler) {
  opts = opts || {};
  // default itemHandler
  itemHandler = itemHandler || defaultItemHandler();

  // validate required user filter
  if (!opts.filter.__user) {
    return Promise.reject(new Error('file:load missing required filter.__user'));
  }

  // default prefix (single)
  opts.prefix = opts.prefix || ''; // ?? ''->'byUserStamp'
  // coerce prefix to an array
  if (!Array.isArray(opts.prefix)) {
    opts.prefix = [opts.prefix];
  }

  // wrap itemHandler for progress and assertions
  itemHandler = wrappedHandler(opts, itemHandler);

  function findFilesForUser(prefix) {
    // find all files in the prefixed path,
    // then filter for '/user/' in path
    return srcFile.find(path.join(prefix || 'byUserStamp', '**/*.json?(l)'))
      .then(function (files) {
        return files.filter((file) => file.includes('/' + opts.filter.__user + '/'))
      });
  }

  var counts = {
    item: 0,
    file: 0
  };

  return Promise.each(opts.prefix, function (prefix) {

    return findFilesForUser(prefix)
      .then(function (files) {
        counts.file += files.length;

        return Promise.each(files, function (file) {
          var items = srcFile.loadJSON(file);
          counts.item += items.length;
          return Promise.each(items, function (item) {
            // return Promise.resolve(true);
            return itemHandler(item);
          });
        });
      });
  })
    .then(() => counts)
    .then(reportCounts(opts));

}

function defaultItemHandler() {
  return (/*item*/) => {
    return Promise.resolve(true);
  };
}

// call any assertions, before the actual handler
// -massage the arguments into old form of srcFile.iterator's handler
function wrappedHandler(opts, itemHandler) {
  const assert = combineAssertions(opts);
  return function (item) {
    // log.debug('-file:load Calling handler with item.stamp:%s', item.__stamp);
    assert(item);
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

// functions with bound local isolated scope

// by time, or count,...
function progress() {
  const logEvery = 10000;
  // bound scope variables
  var soFar = 0;
  var start = +new Date();

  // the function we are returning, bound to local variables
  return (item) => {
    soFar++;
    // if (elapsed > 2 ) {
    if (soFar % logEvery === 0) {
      var elapsed = (+new Date() - start) / 1000;
      var rate = (soFar / elapsed).toFixed(0) + 'r/s';
      // log('Progress %s: %s', soFar, elapsed, rate);
      log.verbose('Progress: %s %s %s (%d)', rate, item.__user, item.__stamp,soFar);
      // soFar = 0;
      // start = +new Date();
    }
  };
}

function checkStampOrdering() {
  var maxStamp = '1970-01-01T00:00:00Z'; // to track increasing'ness
  return (item) => {
    var stamp = item.__stamp;
    log.debug('Checking stamp ordering: %s >=? %s', item.__stamp, maxStamp);
    if (stamp < maxStamp) {
      log.error(`Item stamp not increasing: ${stamp} < ${maxStamp}`, item);
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

function reportCounts(opts) {
  const prefix = opts.prefix;
  const user = opts.filter.__user;

  return (counts) => {
    log.verbose('+file.load', {
      prefix: prefix,
      user: user,
      counts: counts
    });
    return Promise.resolve(counts);
  };
}
