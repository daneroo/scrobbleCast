"use strict";

// High level,
// Refactoring of delta.js into:
// A-Transform src -> sink
//  source byDate/<stamp>/<type> : eventually to be replaced by cron source
//  sink byType/podcast/<podcast_uuid>[/episonde/<uuid>] /<stamp>/<type>.json
// And independantly/after
// B- MapReduce
//  source byType/podcast/<podcast_uuid>[/episonde/<uuid>] /<stamp>/<type>.json
//  sink episode|podcast _hitsory.json

var util = require('util');
var fs = require('fs');
var path = require('path');
var _ = require('lodash');
var utils = require('./lib/utils');
var srcFile = require('./lib/source/file');
var sinkFile = require('./lib/sink/file');
var delta = require('./lib/delta');

// Target Key (path) definitions
// - /podcast/<podast_uuid>/<stamp>/01-podcasts <-source type (url)
// - /podcast/<podast_uuid>/episode/<episode_uuid>/<stamp>/0[234]-type <-source type 
// - /episode/<episode_uuid>/<stamp>/0[234]-type <-source type

// @param file(name)
// @param thingsToMerge: [{podcast|episode}]
// return  [{key:{type,[podcast_uuid],uuid,stamp,sourceType} values:[things]}]
function readByDate(file) {
  var thingsToMerge = srcFile.loadJSON(file);
  if (thingsToMerge.length === 0) {
    // throw new Error('readByDate: no things to split by keys: ' + file);
    return [];
  }

  var stamp = utils.stampFromFile(file);
  // match the sourceType and optionally the podcast_uuid for 02-podcasts (old)
  var match = file.match(/(01-podcasts|02-podcasts|03-new_releases|04-in_progress)(\/(.*))?\.json/);
  var sourceType = match[1];
  var podcast_uuid = match[3];
  var type = (sourceType === '01-podcasts') ? 'podcast' : 'episode';

  // extra assert (02- fix)
  if (sourceType === '02-podcasts' && !podcast_uuid) {
    throw (new Error('readByDate: no podcast_uuid for 02-podcasts: ' + file));
  }
  var keyedThings = thingsToMerge.map(function(thing) {

    // assertions
    if (!thing.uuid) {
      throw (new Error('readByDate: no uuid in thing!'))
    }
    if (type === 'episode' && !thing.podcast_uuid && !podcast_uuid) {
      throw (new Error('readByDate: no podcast_uuid for file:' + file));
    }
    if (!thing.title) { // just checking because we are adding to key - for tracing
      throw new Error('readByDate missing title' + JSON.stringify(keyedThings));
    }

    // 02-fix
    if (type === 'episode' && !thing.podcast_uuid) {
      thing.podcast_uuid = podcast_uuid;
    }

    // mapping the key - try to preserve order...
    var key = {
      type: type,
      uuid: thing.uuid,
      stamp: stamp,
      sourceType: sourceType,
    };
    if (key.type === 'episode') {
      key.podcast_uuid = thing.podcast_uuid;
    }

    // optional below
    // decorate with source file/title - for tracing/debug
    _.merge(key, {
      source: file,
      title: thing.title
    });

    return {
      key: key,
      value: thing
    };
  });
  return keyedThings;
}

function writeByType(keyedThings) {
  // should be async
  keyedThings.forEach(sinkFile.write);
}

// srcFile.find('byDate/**/*.json')
srcFile.findByDate()
  .then(function(stamps) {
    utils.logStamp('Starting:Delta2');
    // console.log('stamps', stamps);
    console.log('-|stamps|', stamps.length);

    var uuidProperty = 'uuid'; // common to all: podcasts/episodes

    var partCount = 0;
    var fileCount = 0;

    // should have a version without aggregation
    utils.serialPromiseChainMap(stamps, function(stamp) {
        utils.logStamp(util.format('--iteration stamp: %s',stamp));
        return srcFile.find(path.join('byDate', stamp, '**/*.json'))
          .then(function(files) {

            files.forEach(function(file) {

              // read from source
              // console.log('---file:', file);
              var keyedThings = readByDate(file);

              fileCount++;
              keyedThings.forEach(function(keyedThing) {
                partCount++;
                // Normalize values (bool/null) (no cloning...)
                keyedThing.value = delta.normalize(keyedThing.value);
                // write to sink
                writeByType(keyedThings);
                console.log('---part',keyedThing.key.title);
              });
              // summary so far...
              console.log('---transform: |files|:%d |parts|', fileCount, partCount);
            });
          });
      })
      .then(function(dontCare) {
        utils.logStamp(util.format('Done:Delta2 |files|:%d |parts|',fileCount,partCount));
        return stamps;
      });

  })
  .catch(function(error) {
    console.error('Error:Delta', error);
    utils.logStamp('Error:Delta ' + error);
  });