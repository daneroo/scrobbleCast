'use strict';

// dependencies - core-public-internal
// var fs = require('fs');
// for fs.readdirPromise
var Promise = require('bluebird');
var fs = Promise.promisifyAll(require('fs'), {
  suffix: 'Promise'
});
var path = require('path');
var log = require('../log');
var jsonl = require('../jsonl');

// a-la suffix: 'Promise'
var globPromise = Promise.promisify(require('glob'));

// globals - candidate for config
var dataDirname = 'data';

// dataDirname relative filename (internal)
function resolveData(file) {
  return path.resolve(dataDirname, file);
}

// this version is relative to dataDirname
function loadJSON(file) {
  return jsonl.read(resolveData(file));
}

// internal (for checking find's results)
function confirmSorted(files) {
  var sorted = true;
  var lastFile;
  files.forEach(function (file) {
    if (lastFile) {
      var ok = file >= lastFile;
      if (!ok) {
        log.verbose('confirmSorted unexpected %s < %s', file, lastFile);
        sorted = false;
      }
    }
    lastFile = file;
  });
  if (!sorted) {
    var msg = 'files are not sorted';
    log.error(msg);
    throw (new Error(msg));
  }
  return files;
}

// get datestamps with fs.readdir on dataDirname/byUserStamp/user
// guaranteed to be sorted?
// basepath default is dataDirname
function findByUserStamp(user, basepath) {
  basepath = basepath || dataDirname;
  // basepath default is dataDirname
  var dir = path.join(basepath, 'byUserStamp', user);
  return fs.readdirPromise(dir)
    .then(confirmSorted)
    .catch(function (err) {
      // log and rethrow
      console.log('findByUserStamp error:', err);
      throw err;
    });
}

//  just break this into parts by Date
function find(pattern) {
  return globPromise(pattern, {
    cwd: dataDirname
  })
    .then(function (files) {
      // just for debugging
      // console.log('globPromise %s found: %d files', pattern, files.length);
      return files;
    })
    .then(confirmSorted)
    .catch(function (err) {
      // log and rethrow
      console.log('globPromise error:', err);
      throw err;
    });
}

// get datestamps with fs.readdir on dataDirname
// still used for toUserStamp
function findByDate() {
  return fs.readdirPromise(path.join(dataDirname, 'byDate'));
}

// traverse data directory. starting
function iterator(extrapath, allCredentials, callbackReturningPromise, pattern, fileFilter) {
  pattern = pattern || '**/*.json';
  var basepath = path.join(dataDirname, extrapath);
  var counts = {};
  return Promise.each(allCredentials, function (credentials) {
    counts[credentials.name] = counts[credentials.name] || {
      part: 0,
      file: 0,
      stamp: 0,
      ignoredFiles: 0
    };
    var c = counts[credentials.name];
    return findByUserStamp(credentials.name, basepath)
      .then(function (stamps) {
        return Promise.each(stamps, function (stamp) {
          return find(path.join(extrapath, 'byUserStamp', credentials.name, stamp, pattern))
            .then(function (files) {
              c.stamp++;
              return Promise.each(files, function (file) {
                if (fileFilter && !fileFilter(credentials, stamp, file)) {
                  c.ignoredFiles++;
                  return Promise.resolve(true);
                }
                var items = loadJSON(file);
                c.file++;
                return Promise.each(items, function (item) {
                  c.part++;
                  return callbackReturningPromise(credentials, stamp, file, item, counts);
                });

              });
            });
        });
      });
  })
    .then(function () {
      return counts;
    });
}

// 2015-11-06 Not yet used, first candidate is dedup.js
// call the iterator with extrapath='rollup'
// then call the iterator with passed extrapath for subsequent items (by date)
function iteratorWithRollup(extrapath, allCredentials, callbackReturningPromise, pattern, fileFilter) {
  var maxStamp = '1970-01-01T00:00:00Z';

  // For the first invocation ('rollup')
  function wrapCallbackAndGrabDateHandler(credentials, stamp, file, item, counts) {
    maxStamp = item.__stamp;
    if (callbackReturningPromise) {
      return callbackReturningPromise(credentials, stamp, file, item, counts);
    }
    return Promise.resolve(true);
  }

  // For the second part:
  // compose a dateSkippFilter with any passed in fileFilter (if present)
  // our date filter takes precedence
  function skippingWrappedFilter(credentials, stamp, file /*, item */) {
    var shouldProceed = (stamp > maxStamp);
    if (!shouldProceed) {
      return shouldProceed;
    }
    if (fileFilter) {
      return fileFilter(credentials, stamp, file);
    }
  }

  return iterator('rollup', allCredentials, wrapCallbackAndGrabDateHandler, pattern, fileFilter)
    .then(function (/*counts*/) {
      // TODO correct return counts...
      console.log('Now call iterator with extrapath: %s after: %s', extrapath, maxStamp);
      return iterator(extrapath, allCredentials, callbackReturningPromise, pattern, skippingWrappedFilter);
    });
}

// TODO: change API to .read
exports = module.exports = {
  dataDirname: dataDirname,
  loadJSON: loadJSON,
  find: find,
  findByDate: findByDate,
  findByUserStamp: findByUserStamp,
  iterator: iterator,
  iteratorWithRollup: iteratorWithRollup
};
