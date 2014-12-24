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

// globals
var allCredentials = require('./credentials.json');

// mv the file to dedup folder
// should be async
function dedup(file) {
  var path = require('path');
  var mkdirp = require('mkdirp');
  var dataDirname = 'data';

  var oldFilename = path.join(dataDirname, file);
  var oldDir = path.dirname(oldFilename);

  var nuFilename = path.join(dataDirname, 'dedup', file);
  var nuDir = path.dirname(nuFilename)

  mkdirp.sync(nuDir);
  fs.renameSync(oldFilename, nuFilename);
  console.log('-exec fs.renameSync(%s, %s)', oldFilename, nuFilename);

  // now prune oldDir (and parent) - if empty
  try {
    fs.rmdirSync(oldDir);
    // only prints if emtpy - no error
    console.log('-exec fs.rmdirSync(%s)', oldDir);
    // and parent - unless oldDir already not empty...
    fs.rmdirSync(path.dirname(oldDir));
    // only prints if emtpy - no error
    console.log('-exec fs.rmdirSync(%s)', path.dirname(oldDir));
  } catch (e) {
    // code: 'ENOTEMPTY'
    // console.log('rmdir error:',e);
  } finally {
    // console.log('+exec fs.rmdirSync(%s) (and parent)',oldDir);
  }
}

utils.serialPromiseChainMap(allCredentials, function(credentials) {
  utils.logStamp('Starting job for ' + credentials.name);

  return srcFile.findByUserStamp(credentials.name)
    .then(function(stamps) {
      utils.logStamp('Starting:Dedup for ' + credentials.name);
      console.log('-|stamps|', stamps.length);

      var uuidProperty = 'uuid'; // common to all: podcasts/episodes
      var podcastHistory = new delta.AccumulatorByUuid();
      var episodeHistory = new delta.AccumulatorByUuid();

      var partCount = 0;
      var fileCount = 0;
      var dedupPartCount = 0;
      var dedupFileCount = 0;

      // should have a version without aggregation
      return utils.serialPromiseChainMap(stamps, function(stamp) {
          console.log('--iteration stamp:', credentials.name, stamp);
          return srcFile.find(path.join('byUserStamp', credentials.name, stamp, '**/*.json'))
            .then(function(files) {

              files.forEach(function(file) {

                // console.log('---file:', file);
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
                    // TODO append to redux
                  } else {
                    dedupPartCount++;
                  }

                });

                // TODO write redux
                if (!fileHasChanges) {
                  dedupFileCount++;
                  dedup(file);
                  // console.log('---dedup: file %d/%d  part %d/%d', dedupFileCount, fileCount, dedupPartCount, partCount);
                }

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
            sortAndSave('podcast-history-'+credentials.name+'.json', podcastHistory);
            sortAndSave('episode-history-'+credentials.name+'.json', episodeHistory);

          console.log('Done:dedup[%s] |f|: %d/%d  |p|: %d/%d',credentials.name, dedupFileCount, fileCount, dedupPartCount, partCount);
          utils.logStamp('Done:Dedup[' + credentials.name + '] |f|:' + fileCount + ' |p|:' + partCount);
          return stamps;
        });

    })
    .catch(function(error) {
      console.error('Error:Dedup', error);
      utils.logStamp('Error:Dedup ' + error);
    });
});