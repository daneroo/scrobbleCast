"use strict";

// Acculumalte delta history per user, over <data>/redux
// Note: run dedup first...

var fs = require('fs');
var path = require('path');
var _ = require('lodash');
var utils = require('./lib/utils');
var srcFile = require('./lib/source/file');
var delta = require('./lib/delta');

// globals
var allCredentials = require('./credentials.json');

utils.serialPromiseChainMap(allCredentials, function(credentials) {
  utils.logStamp('Starting job for ' + credentials.name);

  // var basepath = path.join(srcFile.dataDirname, 'redux');
  var basepath = srcFile.dataDirname;

  return srcFile.findByUserStamp(credentials.name, basepath)
    .then(function(stamps) {
      utils.logStamp('Starting:Dedup for ' + credentials.name);
      console.log('-|stamps|', stamps.length);

      var uuidProperty = 'uuid'; // common to all: podcasts/episodes
      var podcastHistory = new delta.AccumulatorByUuid();
      var episodeHistory = new delta.AccumulatorByUuid();

      var partCount = 0;
      var fileCount = 0;

      // should have a version without aggregation
      return utils.serialPromiseChainMap(stamps, function(stamp) {
          console.log('--iteration stamp:', credentials.name, stamp);
          return srcFile.find(path.join('byUserStamp', credentials.name, stamp, '**/*.json'))
            .then(function(files) {

              files.forEach(function(file) {

                console.log('---file:', file);
                var items = srcFile.loadJSON(file);

                fileCount++;
                var fileHasChanges = false;
                items.forEach(function(item) {
                  partCount++;

                  // passed item is cloned, and normalized in accumulator

                  var changeCount = 0;
                  if (item.__type === 'episode') {
                    // console.log('|episode|', thingsToMerge.length,file);
                    changeCount += episodeHistory.merge(item);
                  } else {
                    // console.log('|podcasts|', thingsToMerge.length,file);
                    changeCount += podcastHistory.merge(item);
                  }

                  if (changeCount > 0) {
                    fileHasChanges = true;
                    console.log('---|Δ|', changeCount, item.title);
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
          sortAndSave('podcast-history-' + credentials.name + '.json', podcastHistory);
          sortAndSave('episode-history-' + credentials.name + '.json', episodeHistory);

          function filterPlayHistory(outfile, history) {
            console.log('|' + outfile + '|=', _.size(history.accumulators));
            var filtered = _.map(history.accumulators, function(episode) {
              episode - _.cloneDeep(episode);
              // some kind of epoch value for : 'Never Played'
              // episode.lastPlayed='2009-01-03T18:15:05.000Z'; // Bitcoin Genesis
              episode.lastPlayed='1970-01-01T00:00:00Z';
              var history = episode.history;
              var plays = [];
              history.forEach(function(h) {
                var pertinent = false;
                var playHistory = {
                  __stamp: h.__stamp,
                  __sourceType : h.__sourceType
                };
                h.changes.forEach(function(chg) {
                  if (chg.key==='playing_status'){
                    pertinent=true;
                    playHistory.playing_status = chg.to;
                    if (chg.to > 0){
                      episode.lastPlayed=playHistory.__stamp;
                    }
                  }
                  if (chg.key==='played_up_to'){
                    pertinent=true;
                    playHistory.played_up_to = chg.to;
                    if (chg.to > 0){
                      episode.lastPlayed=playHistory.__stamp;
                    }
                  }
                });
                if (pertinent) {
                  plays.push(playHistory);
                }
              });
              delete episode.history;
              episode.plays = plays;
              return episode;
            });

            var sorted = _.sortBy(filtered, ['lastPlayed','lastUpdated']).reverse();

            fs.writeFileSync(outfile, JSON.stringify(sorted, null, 2));
          }

          filterPlayHistory('episode-play-history-' + credentials.name + '.json', episodeHistory);

          console.log('Done:dedup[%s] |f|: %d  |p|: %d', credentials.name, fileCount, partCount);
          utils.logStamp('Done:Dedup[' + credentials.name + '] |f|:' + fileCount + ' |p|:' + partCount);
          return stamps;
        });

    })
    .catch(function(error) {
      console.error('Error:Dedup', error);
      utils.logStamp('Error:Dedup ' + error);
    });
});