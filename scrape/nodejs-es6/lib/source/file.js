'use strict';

// dependencies - core-public-internal
// var fs = require('fs');
// for fs.readdirPromise
var Promise = require('bluebird');
var fs = Promise.promisifyAll(require('fs'), {
  suffix: 'Promise'
});
var path = require('path');
// a-la suffix: 'Promise'
var globPromise = Promise.promisify(require('glob'));
var utils = require('../utils');

// globals - candidate for config
var dataDirname = 'data';

// dataDirname relative filename (internal)
function resolveData(file) {
  return path.resolve(dataDirname, file);
}

// TODO: make these Async/Promised
function loadJSON(file) {
  // var result = require(resolveData(file)); // BAD
  var result = JSON.parse(fs.readFileSync(resolveData(file)));
  return result.episodes || result.podcasts || result;
}

// internal (for checking find's results)
function confirmSorted(files) {
  var sorted = true;
  var lastFile;
  files.forEach(function(file) {
    if (lastFile) {
      var ok = file > lastFile;
      if (!ok) {
        console.log('***********', lastFile, file);
        sorted = false;
      }
    }
    lastFile = file;
  });
  if (!sorted) {
    throw (new Error('files are not sorted'));
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
    .catch(function(err) {
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
    .then(function(files) {
      // just for debugging
      // console.log('globPromise %s found: %d files', pattern, files.length);
      return files;
    })
    .then(confirmSorted)
    .catch(function(err) {
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

function iterator(extrapath, allCredentials, callbackReturningPromise) {
  var basepath = path.join(dataDirname, extrapath);
  var counts = {};
  return Promise.each(allCredentials, function(credentials) {
    counts[credentials.name] = counts[credentials.name] || {
      part: 0,
      file: 0,
      stamp: 0
    };
    var c = counts[credentials.name];
    return findByUserStamp(credentials.name, basepath)
      .then(function(stamps) {
        return Promise.each(stamps, function(stamp) {
            return find(path.join(extrapath, 'byUserStamp', credentials.name, stamp, '**/*.json'))
              .then(function(files) {
                c.stamp++;
                return Promise.each(files,function(file) {
                  var items = loadJSON(file);
                  c.file++;
                  return Promise.each(items,function(item) {
                    c.part++;
                    return callbackReturningPromise(credentials, stamp, file, item, counts);
                  });

                });
              });
          });
      })
      .catch(function(error) {
        console.error('Error:Dedup', error);
        utils.logStamp('Error:Dedup ' + error);
      });
  })
  .then(function(){
    return counts;
  });

}

// TODO: change API to .read
exports = module.exports = {
  dataDirname: dataDirname,
  loadJSON: loadJSON,
  find: find,
  findByDate: findByDate,
  findByUserStamp: findByUserStamp,
  iterator:iterator
};
