'use strict';

// Acculumalte delta history per user, over <data>/byUserStamp
// remove null change files (<data>/dedup/byUserStamp)
// copy original file (when delta>0) to <data>/noredux/byUserStamp
// overwrite minimal changeset to <data>/byUserStamp

var fs = require('fs');
var path = require('path');
var mkdirp = require('mkdirp');
var Promise = require('bluebird');
var crypto = require('crypto');
var _ = require('lodash');
var utils = require('./utils');
var srcFile = require('./source/file');
var sinkFile = require('./sink/file');
var delta = require('./delta');

// Exported API
exports = module.exports = {
  dedupTask: dedupTask
};

// if (require.main === module) {
//   console.log('called directly');
//   var allCredentials = require('../credentials.json');
//   utils.serialPromiseChainMap(allCredentials, dedupTask);
// } else {
//   console.log('required as a module');
// }

// TODO: use srcFile.iterator, but Accumulators are in the wrong scope (per user)
function dedupTask(credentials) {
  return srcFile.findByUserStamp(credentials.name)
    .then(function(stamps) {
      // utils.logStamp('Starting:Dedup for ' + credentials.name);
      // console.log('-|stamps|', stamps.length);

      var podcastHistory = new delta.AccumulatorByUuid();
      var episodeHistory = new delta.AccumulatorByUuid();

      var partCount = 0;
      var fileCount = 0;
      var dedupPartCount = 0;
      var dedupFileCount = 0;

      // should have a version without aggregation
      return Promise.each(stamps, function(stamp) {
          // console.log('--iteration stamp:', credentials.name, stamp);
          return srcFile.find(path.join('byUserStamp', credentials.name, stamp, '**/*.json'))
            .then(function(files) {

              return Promise.each(files, function(file) {

                // console.log('---file:', file);
                var items = srcFile.loadJSON(file);
                var redux = [];

                fileCount++;
                var fileHasChanges = false;
                return Promise.each(items, function(item) {
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

                  })
                  .then(function() {
                    // fileHasChanges === redux.length>0
                    if (!fileHasChanges) {
                      dedupFileCount++;
                      moveToDedup(file);
                      // console.log('---dedup: file %d/%d  part %d/%d', dedupFileCount, fileCount, dedupPartCount, partCount);
                    }
                    // else: fileHasHasganges===true or redux.length>0
                    if (redux.length > 0) {
                      // console.log('---redux: |parts|: %d file: %s', redux.length, file);
                      replaceRedux(file, items, redux);
                    }

                  });

              });
            });
        })
        .then(function(dontCare) {
          function sortAndSave(outfile, history) {

            // console.log('|' + outfile + '|=', _.size(history.accumulators));
            // just write out the accumulators dictionary, it is the only attribute!
            var sorted = _.sortBy(history.accumulators, function(item) {
              // should this use sortByAll ? not in 2.4.2
              // careful sorting by [__changeCount], compare by string when returning an array
              // this sorts by a numerically
              // _.sortBy([{a:1},{a:2},{a:3},{a:11},{a:12}],function(item){return item.a;});
              // this sorts a lexicographically
              // _.sortBy([{a:1,b:'a'},{a:2,b:'a'},{a:3,b:'a'},{a:11,b:'a'},{a:12,b:'a'}],function(item){return [item.a,item.b];})
              // return [item.meta.__changeCount,item.meta.__lastUpdated, item.uuid];

              // sort by lastUpdated,uuid (for uniqueness)
              return [item.meta.__lastUpdated, item.uuid];
            }).reverse();
            var json = JSON.stringify(sorted, null, 2);

            fs.writeFileSync(path.join(sinkFile.dataDirname, outfile), json);
            utils.logStamp('md5(' + outfile + '):' + md5(json));
          }
          sortAndSave('podcast-history-' + credentials.name + '.json', podcastHistory);
          sortAndSave('episode-history-' + credentials.name + '.json', episodeHistory);

          // console.log('Done:dedup[%s] |f|: %d/%d  |p|: %d/%d', credentials.name, dedupFileCount, fileCount, dedupPartCount, partCount);
          // utils.logStamp('Done:Dedup[' + credentials.name + '] |f|:' + fileCount + ' |p|:' + partCount);
          return stamps;
        });

    })
    .catch(function(error) { // TODO: might remove this altogether
      console.error('Error:Dedup', error);
      utils.logStamp('Error:Dedup ' + error);
      throw error;
    });
}

// mv the file to dedup folder
// should be async
function moveToDedup(file) {
  move(file, null, 'dedup');
}

// Replace the original file with redux:(only changes items) if appropriate
// if items==redux: do nothing
// -move the original file to 'noredux' folder
// -write the redux file to the
function replaceRedux(file, origItems, reduxItems) {
  if (!_.isEqual(origItems, reduxItems)) {
    console.log('  replace:redux %s', file);

    // write the redux file
    var basepath = path.join(sinkFile.dataDirname, 'redux');
    sinkFile.writeByUserStamp(reduxItems, basepath);

    // move the original to noredux
    move(file, null, 'noredux');

    // move the redux version back to original
    move(file, 'redux', null);

  }
}

// move file from one basepath to another:
// e.g.:  data/<fromPath>/<file> -> data/<toPath>/<file>
// from and to: should be one of: null,'dedup','noredux'
function move(file, fromPath, toPath) {

  var oldFilename = filenameAtBase(file, fromPath);
  var oldDir = path.dirname(oldFilename);

  var nuFilename = filenameAtBase(file, toPath);
  var nuDir = path.dirname(nuFilename);

  // refuse to clober an existing file
  if (fs.existsSync(nuFilename)) {
    console.log('Dedup:move %s -> %s', oldFilename, nuFilename);
    console.log('Dedup:move refusing to clobber %s', nuFilename);
  }
  mkdirp.sync(nuDir);
  fs.renameSync(oldFilename, nuFilename);
  // console.log('-exec fs.renameSync(%s, %s)', oldFilename, nuFilename);

  // now prune oldDir (and parent) - if empty
  try {
    fs.rmdirSync(oldDir);
    // only prints if emtpy - no error
    // console.log('-exec fs.rmdirSync(%s)', oldDir);
    // and parent - unless oldDir already not empty...
    fs.rmdirSync(path.dirname(oldDir));
    // only prints if emtpy - no error
    // console.log('-exec fs.rmdirSync(%s)', path.dirname(oldDir));
  } catch (e) {
    // code: 'ENOTEMPTY'
    // console.log('rmdir error:',e);
  } finally {
    // console.log('+exec fs.rmdirSync(%s) (and parent)',oldDir);
  }
}

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

function md5(str) {
  var hash = crypto.createHash('md5').update(str).digest('hex');
  return hash;
}
