"use strict";

// High level,
// load podcasts/episodes (as needed)
// for each file in (new_releases, then in_progress)
//   for each episode in file.episodes
//     compare episode with known podcats/episode (if exists)

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

// example file input patterns
// data/byDate/2014-11-07T08:34:00Z/02-podcasts/2cfd8eb0-58b1-012f-101d-525400c11844.json
// data/byDate/2014-11-05T07:40:00Z/03-new_releases.json
// data/byDate/2014-11-05T07:40:00Z/04-in_progress.json

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
  // keyedThings.forEach(function(keyedThing){
  //   if (keyedThing.key.type==='episode'){
  //     return;
  //   }
  //   sinkFile.write(keyedThing);
  // });
}

// srcFile.find('byDate/**/*.json')
srcFile.findByDate()
  .then(function(stamps) {
    utils.logStamp('Starting:Delta ');
    // console.log('stamps', stamps);
    console.log('-|stamps|', stamps.length);
    // stamps = stamps.slice(0, 3000);
    console.log('+|stamps|', stamps.length);

    var uuidProperty = 'uuid'; // common to all: podcasts/episodes
    var podcastHistory = new delta.AccumulatorByUuid();
    var episodeHistory = new delta.AccumulatorByUuid();

    // should have a version without aggregation
    utils.serialPromiseChainMap(stamps, function(stamp) {
        console.log('--iteration stamp:', stamp);
        return srcFile.find(path.join('byDate', stamp, '**/*.json'))
          .then(function(files) {

            files.forEach(function(file) {

              console.log('---file:', file);

              var keyedThings = readByDate(file);

              keyedThings.forEach(function(keyedThing){
                // watch this overwrite (could do my own mergeMany...)
                // how about we normalize here (no cloning...)
                var keyedThings = [keyedThing];
                var changeCount = 0;
                if (file.match(/01-/)) {
                  // console.log('|podcasts|', thingsToMerge.length,file);
                  changeCount += podcastHistory.mergeMany(keyedThings);
                } else {
                  // console.log('|episodes|', thingsToMerge.length,file);
                  changeCount += episodeHistory.mergeMany(keyedThings);
                }
                if (changeCount > 0) {
                  writeByType(keyedThings);
                  console.log('---changes:', changeCount, file);
                }
              });
            });
          });
      })
      .then(function(dontCare) {
        function sortAndSave(outfile, history) {
          console.log('|' + outfile + '|=', _.size(history.accumulators));
          // just write out the accumulators dictionary, it is the only attribute!
          var sorted = _.sortBy(history.accumulators, 'lastUpdated').reverse();
          fs.writeFileSync(outfile, JSON.stringify(sorted, null, 2));
        }
        sortAndSave('podcast-history.json', podcastHistory);
        sortAndSave('episode-history.json', episodeHistory);

        var oneEpisode = '5e112290-5038-0132-cfbf-5f4c86fd3263';
        fs.writeFileSync('one-episode-history.json', JSON.stringify(episodeHistory.accumulators[oneEpisode], null, 2));
        utils.logStamp('Done:Delta |e|:' + _.size(episodeHistory.accumulators));
        return stamps;
      });

  })
  .catch(function(error) {
    console.error('Error:Delta', error);
    utils.logStamp('Error:Delta ' + error);
  });