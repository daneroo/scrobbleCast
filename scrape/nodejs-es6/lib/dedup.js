'use strict';

// Acculumalte delta history per user, over <data>/byUserStamp
// remove null change files (<data>/dedup/byUserStamp)
// copy original file (when delta>0) to <data>/noredux/byUserStamp
// overwrite minimal changeset to <data>/byUserStamp

// dependencies - core-public-internal
var fs = require('fs');
var path = require('path');
var mkdirp = require('mkdirp');
var Promise = require('bluebird');
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
// TODO if using iterator, what hooks do I neeed for inviking deduplication
function dedupTask(credentials) {
  var historyByType = new delta.AccumulatorByTypeByUuid();
  var maxStamp = '1970-01-01T00:00:00Z'; // to track increasing'ness

  return Promise.resolve(true)
    .then(function() {

      // TODO use datadir
      if (!fs.existsSync('data/rollup/byUserStamp')) {
        utils.logStamp('Rollup: not accelerated');
        return Promise.resolve(true);
      }
      // Read and accumulate items from 'rollup'
      function itemHandler(credentials, stamp, file, item) {
        maxStamp = item.__stamp;
        var changeCount = historyByType.merge(item);
        // if I want to check for dedupedness, need to account for first view of items
        // if (changeCount > 0) {
        //   console.log('undeduped item %j',item);
        //   throw new Error('Undeduped item in rollup file: ' + file);
        // }
        return Promise.resolve(true);
      }
      return srcFile.iterator('rollup', [credentials], itemHandler, '**/*.json?(l)')
        .then(function(counts) {
          utils.logStamp('Rollup: accelerated up to: ' + maxStamp);
          return counts; // although we aren using it here yet...
        });
    })
    .then(function() {
      return srcFile.findByUserStamp(credentials.name)
        .then(function(stamps) {
          // console.log('-|stamps|', stamps.length);
          var partCount = 0;
          var fileCount = 0;
          var dedupPartCount = 0;
          var dedupFileCount = 0;

          // should have a version without aggregation
          return Promise.each(stamps, function(stamp) {
            // console.log('--iteration stamp:', credentials.name, stamp);
            if (stamp <= maxStamp) {
              // console.log('-- skipped iteration stamp:', credentials.name, stamp);
              return Promise.resolve(true);
            }
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

                      var changeCount = historyByType.merge(item);
                      if (changeCount > 0) {
                        fileHasChanges = true;
                        redux.push(item);
                        // console.log('---|Δ|', changeCount, item.title);
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
        });
    })
    .then(function(dontCare) {
      historyByType.sortAndSave(credentials.name);
      return true;
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
