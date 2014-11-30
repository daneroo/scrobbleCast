"use strict";

// dependencies - core-public-internal
// var fs = require('fs');
// for fs.readdirPromise
var Promise = require("bluebird");
var fs = Promise.promisifyAll(require("fs"), {
  suffix: 'Promise'
});
var path = require('path');
var mkdirp = require('mkdirp');
// a-la suffix: 'Promise'
var globPromise = Promise.promisify(require('glob'));

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

// TODO: gonna need user id
// merge with version in index, and move to lib
// Note: Filename stamps rounded to minute
function writeResponse(base, response, optionalStamp) {

  // announce what we are doing io.file
  logStamp(base);

  var stampForFile = optionalStamp || stamp('minute');
  // Note: base may include a path like: 'podcasts/f54c667'
  // e.g. ./data/byDate/2014-...Z/pocdasts/f54c667.json
  var filename = path.join(dataDirname, 'byDate', stampForFile, [base, 'json'].join('.'));

  var dir = path.dirname(filename)
  mkdirp.sync(dir);

  var content = JSON.stringify(response, null, 2);
  fs.writeFileSync(filename, content);

  logStamp('+ ' + filename);
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
// guaranteed to be sorted?
function findByDate() {
  return fs.readdirPromise(path.join(dataDirname, 'byDate'))
}

// TODO: change API to .read/.write
var exports = module.exports = {
  loadJSON: loadJSON,
  writeResponse: writeResponse,
  find: find,
  findByDate: findByDate
};