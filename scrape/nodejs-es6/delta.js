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
var delta = require('./lib/delta');

// globals
// external data for creds.
var dataDirname = 'data';

function resolve(file) {
  return path.resolve(dataDirname, file);
}

// TODO: make these Async/Promised
function loadJSON(file) {
  var result = require(resolve(file));
  return result.episodes || result.podcasts || result;
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
      console.log('pglob.in_progress %s found: %d files', pattern, files.length);
      return files;
    })
    .then(confirmSorted)
    .catch(function(err) {
      // log and rethrow
      console.log('pglob.in_progress error:', err);
      throw err;
    });
}


function stampFromFile(file) {
  var stamp = file.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z/);
  if (stamp && stamp.length) {
    stamp = new Date(stamp[0]);
    stamp.setSeconds(0);
    stamp = stamp.toJSON().replace(/\.\d{3}Z$/, 'Z');
  }
  return stamp;
}

find('byDate/**/*.json')
  .then(function(files) {
    utils.logStamp('Starting:Delta ' + files.length);

    var uuidProperty = 'uuid'; // common to all: podcasts/episodes
    var podcastHistory = new delta.AccumulatorByUuid();
    var episodeHistory = new delta.AccumulatorByUuid();

    files.forEach(function(file) {

      var thingsToMerge = loadJSON(file);
      var stamp = stampFromFile(file);
      var source = file;

      if (file.match(/01-/)) {
        // console.log('|podcasts|', thingsToMerge.length,file);
        podcastHistory.mergeMany(thingsToMerge, uuidProperty, stamp, source);
      } else {
        // console.log('|episodes|', thingsToMerge.length,file);
        episodeHistory.mergeMany(thingsToMerge, uuidProperty, stamp, source);
      }
    });
    // just write out the accumulators dictionary, it is the only attribute!
    fs.writeFileSync('podcast-history.json', JSON.stringify(podcastHistory.accumulators, null, 2));
    fs.writeFileSync('episode-history.json', JSON.stringify(episodeHistory.accumulators, null, 2));
    var oneEpisode = 'd35640a0-bc37-0131-22ca-723c91aeae46';
    fs.writeFileSync('one-episode-history.json', JSON.stringify(episodeHistory.accumulators[oneEpisode], null, 2));
    utils.logStamp('Done:Delta ' + files.length);
  })
  .catch(function(error) {
    console.error('Error:Delta', error);
    utils.logStamp('Error:Delta ' + error);
  });