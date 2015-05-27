"use strict";

// Acculumalte delta history per user, over <data>/redux
// Note: run dedup first...

var path = require('path');
var utils = require('./lib/utils');
var srcFile = require('./lib/source/file');

// globals
var allCredentials = require('./credentials.json');

function doOneItem(credentials, stamp, file, item) {
  // console.log('file:',file);
}

function iterator(extrapath, allCredentials, cb) {
  var basepath = path.join(srcFile.dataDirname, '');
  var counts = {};
  return utils.serialPromiseChainMap(allCredentials, function(credentials) {
    counts[credentials.name] = counts[credentials.name] || {
      part: 0,
      file: 0,
      stamp: 0
    };
    var c = counts[credentials.name];
    return srcFile.findByUserStamp(credentials.name, basepath)
      .then(function(stamps) {
        return utils.serialPromiseChainMap(stamps, function(stamp) {
            return srcFile.find(path.join(extrapath, 'byUserStamp', credentials.name, stamp, '**/*.json'))
              .then(function(files) {
                c.stamp++;
                files.forEach(function(file) {
                  var items = srcFile.loadJSON(file);
                  c.file++;
                  items.forEach(function(item) {
                    c.part++;
                    cb(credentials, stamp, file, item, counts);
                  });

                });
              });
          })
          .then(function(dontCare) {
            var c = counts[credentials.name];
            console.log('--' + extrapath + '-- ' + credentials.name + '|stamps|:' + c.stamp + ' |f|:' + c.file + ' |p|:' + c.part);
          });

      })
      .catch(function(error) {
        console.error('Error:Dedup', error);
        utils.logStamp('Error:Dedup ' + error);
      });
  });

}

// iterator('noredux', allCredentials, doOneItem);
iterator('', allCredentials, doOneItem);
