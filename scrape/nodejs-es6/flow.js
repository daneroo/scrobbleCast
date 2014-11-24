"use strict";

// High level,
// load podcasts/episodes (as needed)
// for each file in (new_releases, then in_progress)
//   for each episode in file.episodes
//     compare episode with known podcats/episode (if exists)


var fs = require('fs');
var path = require('path');
var mkdirp = require('mkdirp');
var Promise = require("bluebird");
var glob = require("glob");
var pglob = Promise.promisify(glob);
var _ = require('lodash');
var utils = require('./lib/utils');

// globals
// external data for creds.
var dataDirname = 'data';

function resolve(file) {
  return path.resolve(dataDirname, file);
}

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

function find(pattern) {
  return pglob(pattern, {
      cwd: dataDirname
    })
    .then(function(files) {
      console.log('pglob %s found: %d files', pattern, files.length);
      return files;
    })
    .then(confirmSorted)
    .catch(function(err) {
      // log and rethrow
      console.log('pglob.in_progress error:', err);
      throw err;
    });
}


function it1() {
  var start = +new Date()
  utils.logStamp('Starting:Flow');
  return find('byDate/**/*.json')
    .then(function(files) {
      var elapsed = (+new Date() - start) / 1000;
      var rate = files.length / elapsed;
      utils.logStamp('Done:Flow ' + Math.floor(elapsed) + ' seconds');
    });
}

function readdir() {
  return fs.readdirSync(path.join(dataDirname, 'byDate'));
  // return new Promise(function(resolve, reject) {
  //   fs.readdir
  // });
}
var Glob = glob.Glob;

function it2() {
  var zz = 0;
  var start = +new Date()
  utils.logStamp('Starting:Flow');

  var stamps = readdir();
  console.log('#stamps:', stamps.length);
  // var stamp = stamps[0];
  return utils.serialPromiseChainMap(stamps, function(stamp) {
      return new Promise(function(resolve, reject) {
        // var mg = new Glob('byDate/**/*.json', {
        var stampPath = path.join(dataDirname, 'byDate', stamp, '**/*.json');
        // console.log('--path:', stampPath);
        var mg = new Glob(stampPath, function(error, files) {
          if (error) {
            reject(error);
          }
          // var elapsed = (+new Date() - start) / 1000;
          // var rate = files.length / elapsed;
          // utils.logStamp('Done:Flow ' + Math.floor(elapsed) + ' seconds');
          resolve(42);
        });
        // mg
        //   .on('match', function(match) {
        //     if (zz++ % 10000 === 0) {
        //       console.log('  -match', match);
        //     }
        //   })
        //   .on('end', function(matches) {
        //     console.log(' -matches', matches.length);
        //     console.log(' +matches', zz);
        //   });
      });
    })
    .then(function(allthefiles) {
      // console.log('allthefiles:', allthefiles.length);
      var elapsed = (+new Date() - start) / 1000;
      // var rate = allthefiles.length / elapsed;
      utils.logStamp('Done:Flow ' + Math.floor(elapsed) + ' seconds');
    });
}

var it = it2;
Promise.resolve('start')
  .then(it1).then(it2)
  .then(it1).then(it2)
  .then(it1).then(it2)
  .then(it1).then(it2)
  .then(it1).then(it2)
  .then(it1).then(it2)
  .then(it)
  .then(it)
  .then(it)
  .then(it)
  .then(it)
  .then(it)
  .catch(function(error) {
    console.error('Error:Flow', error);
    utils.logStamp('Error:Flow ' + error);
  });

// find('byDate/**/*.json')
// .then(function(files) {
//   utils.logStamp('Starting:Flow ' + files.length);
//   utils.logStamp('Done:Flow ' + files.length);
// })
// .catch(function(error) {
//   console.error('Error:Flow', error);
//   utils.logStamp('Error:Flow ' + error);
// });