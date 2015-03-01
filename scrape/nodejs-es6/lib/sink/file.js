'use strict';

// dependencies - core-public-internal
// var fs = require('fs');
// for fs.readdirPromise
var Promise = require('bluebird');
var fs = Promise.promisifyAll(require('fs'), {
  suffix: 'Promise'
});
var path = require('path');
var mkdirp = require('mkdirp');
var _ = require('lodash');
var utils = require('../utils');

// globals - candidate for config
var dataDirname = 'data';

// items => <__user>/<__stamp>/__sourceType[-<podast_uuid>].json
// items should not be empty
// assert common parts common to all titems
function pathForItems(items) {
  // take first element as representative
  var item = items[0];
  var keys = {
    __user: item.__user,
    __stamp: item.__stamp,
    __sourceType: item.__sourceType
  };

  if (item.__sourceType === '02-podcasts') {
    keys.podcast_uuid = item.podcast_uuid;
  }

  // assertions - for keys
  _.keys(keys).forEach(function(key) {
    if (!keys[key]) {
      console.log('pathForItems: missing key: ' + key);
      console.log('keys', keys);
      throw new Error('pathForItems: missing key: ' + key);
    }
  });

  // assertions - all items have same key elements - using lodash where notation
  if (!_.every(items, keys)) {
    console.log('keys', keys);
    throw new Error('pathForItems: nonuniform key items.');
  }

  var paths = [keys.__user, keys.__stamp];
  if (keys.podcast_uuid) {
    paths.push(keys.__sourceType + '-' + keys.podcast_uuid);
  } else {
    paths.push(keys.__sourceType);
  }

  return paths.join('/');
}

// This was originally called: verifyIdenticalOrWrite
// This was useful for toUserStamp.js verification
// -Attempts to write <items> to <path> (as json)
// -Verifies file does not exist or content is same as original
// -Validates by default (overwrite protection)
// TODO: turnoff validation/overwrite protection.

function write(filename, items) {
  if (fs.existsSync(filename)) {
    // console.log('---- checking %s', filename);
    var olditems = JSON.parse(fs.readFileSync(filename));
    if (!_.isEqual(olditems, items)) {
      fs.writeFileSync('bad-olditems.json', JSON.stringify(olditems, null, 2));
      fs.writeFileSync('bad-newitems.json', JSON.stringify(items, null, 2));
      throw new Error('sink.file.write: verify identical: overwrite prevented');
    } else {
      // console.log('----sink.file.write [skipped because verified] %s', filename);
    }
  } else {
    var content = JSON.stringify(items, null, 2);
    fs.writeFileSync(filename, content);
    // console.log('----sink.file.write %s', filename);
  }
}

// write byUserStamp
// write a collection of items into a json file
// basepath default is dataDirname
// - <basepath>/byUserStamp/<__user>/<__stamp>/__sourceType[-<podast_uuid>].json
function writeByUserStamp(items, basepath) {
  if (!items || !items.length) {
    utils.logStamp('writeByUserStamp: nothing to write');
    return;
  }
  basepath = basepath || dataDirname;

  var basename = pathForItems(items);
  // announce what we are doing io.file
  // utils.logStamp('Writing '+basename);

  var filename = path.join(basepath, 'byUserStamp', [basename, 'json'].join('.'));

  var dir = path.dirname(filename);
  mkdirp.sync(dir);

  // could turnoff verification
  write(filename, items);

}

// deprecated - used by cron through tasks
function writeByDate(base, response, optionalStamp) {

  // announce what we are doing io.file
  utils.logStamp(base);

  var stampForFile = optionalStamp || utils.stamp('minute');
  // Note: base may include a path like: 'podcasts/f54c667'
  // e.g. ./data/byDate/2014-...Z/pocdasts/f54c667.json
  var filename = path.join(dataDirname, 'byDate', stampForFile, [base, 'json'].join('.'));

  var dir = path.dirname(filename);
  mkdirp.sync(dir);

  var content = JSON.stringify(response, null, 2);
  fs.writeFileSync(filename, content);

  utils.logStamp('+ ' + filename);
}

// TODO: change API to .read/.write
exports = module.exports = {
  dataDirname: dataDirname,
  writeByUserStamp: writeByUserStamp,
  writeByDate: writeByDate
};
