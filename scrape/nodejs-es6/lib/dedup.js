"use strict";

// Acculumalte delta history per user, over <data>/byUserStamp
// remove null change files (<data>/dedup/byUserStamp)
// copy original file (when delta>0) to <data>/noredux/byUserStamp
// overwrite minimal changeset to <data>/byUserStamp

var fs = require('fs');
var path = require('path');
var mkdirp = require('mkdirp');
var crypto = require('crypto');
var _ = require('lodash');
var utils = require('./lib/utils');
var srcFile = require('./lib/source/file');
var sinkFile = require('./lib/sink/file');
var delta = require('./lib/delta');

// globals
var allCredentials = require('./credentials.json');

// construct path rooted at dataDirName, poosibly with a base path extension:
// base==null -> data/byUserStamp/<file>
// base=='dedup' -> data/dedup/byUserStamp/<file>
// base=='noredux' -> data/noredux/byUserStamp/<file>
function filenameAtBase(file, basePartialPath) {
    var dataDirname = sinkFile.dataDirname;
    if (!basePartialPath) {
      return path.join(dataDirname, file);
    } else {
      return path.join(dataDirname, basePartialPath, file);
    }
  }

  // move file from one basepath to another:
  // e.g.:  data/<fromPath>/<file> -> data/<toPath>/<file>
  // from and to: should be one of: null,'dedup','noredux'
function move(file, fromPath, toPath) {

    var oldFilename = filenameAtBase(file, fromPath);
    var oldDir = path.dirname(oldFilename);

    var nuFilename = filenameAtBase(file, toPath);
    var nuDir = path.dirname(nuFilename)

    // refuse to clober an existing file
    if (fs.existsSync(nuFilename)) {
      console.log('Dedup:move %s -> %s', oldFilename, nuFilename);
      console.log('Dedup:move refusing to clobber %s', nuFilename);
    }
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
  // mv the file to dedup folder
  // should be async
function dedup(file) {
  move(file, null, 'dedup');
}

// Replace the original file with redux:(only changes items) if appropriate
// if items==redux: do nothing
// -move the original file to 'noredux' folder
// -write the redux file to the
function replaceRedux(file, origItems, reduxItems) {
  if (!_.isEqual(origItems, reduxItems)) {
    console.log('Dedup:redux %s', file);

    // write the redux file
    var basepath = path.join(sinkFile.dataDirname, 'redux');
    sinkFile.writeByUserStamp(reduxItems, basepath);

    // move the original to noredux
    move(file, null, 'noredux');

    // move the redux version back to original
    move(file, 'redux', null);

  }
}

function md5(str) {
  var hash = crypto.createHash('md5').update(str).digest('hex');
  return hash;
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
                var redux = [];

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
                    redux.push(item);
                    // console.log('---|Δ|', changeCount, item.title);
                    // TODO append to redux
                  } else {
                    dedupPartCount++;
                  }

                });


                // fileHasChanges === redux.length>0
                if (!fileHasChanges) {
                  dedupFileCount++;
                  dedup(file);
                  // console.log('---dedup: file %d/%d  part %d/%d', dedupFileCount, fileCount, dedupPartCount, partCount);
                }
                // else: fileHasHasganges===true or redux.length>0
                if (redux.length > 0) {
                  // console.log('---redux: |parts|: %d file: %s', redux.length, file);
                  replaceRedux(file,items,redux);
                }

              });
            });
        })
        .then(function(dontCare) {
          function sortAndSave(outfile, history) {
            console.log('|' + outfile + '|=', _.size(history.accumulators));
            // just write out the accumulators dictionary, it is the only attribute!
            var sorted = _.sortBy(history.accumulators, 'lastUpdated').reverse();
            var json = JSON.stringify(sorted, null, 2);
            fs.writeFileSync(outfile, json);
            utils.logStamp('Wrote:Dedup[' + outfile + '] md5:' + md5(json));
          }
          sortAndSave('podcast-history-' + credentials.name + '.json', podcastHistory);
          sortAndSave('episode-history-' + credentials.name + '.json', episodeHistory);

          console.log('Done:dedup[%s] |f|: %d/%d  |p|: %d/%d', credentials.name, dedupFileCount, fileCount, dedupPartCount, partCount);
          utils.logStamp('Done:Dedup[' + credentials.name + '] |f|:' + fileCount + ' |p|:' + partCount);
          return stamps;
        });

    })
    .catch(function(error) {
      console.error('Error:Dedup', error);
      utils.logStamp('Error:Dedup ' + error);
    });
});
