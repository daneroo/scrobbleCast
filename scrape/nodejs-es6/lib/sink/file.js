'use strict';

// dependencies - core-public-internal
// var fs = require('fs');
// for fs.readdirPromise
var Promise = require('bluebird');
var fs = Promise.promisifyAll(require('fs'), {
  suffix: 'Promise'
});
var path = require('path');
var util = require('util');
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
// -Verifies file does not exist or content is same as original
// -Validates by default (overwrite protection)
// options:
//  overwrite:bool allow overwriting of file with different content default:false
//  log:bool print the md5,size and line count default:false
// TODO options: pretty=true, gzip=true, sign=true
// TODO split into testable components
function write(filename, items, opts) {
  opts = _.merge({
    overwrite: false,
    log: false
  }, opts);

  // utility function to write json, or jsonl
  function makeJSON() {
    var json;
    if (filename.match(/\.jsonl$/)) {
      if (!Array.isArray(items)) {
        throw new Error('sink.file.write.makeJSON:items is not an array')
      }
      var lines = [];
      items.forEach(function(el) {
        lines.push(JSON.stringify(el));
      });
      json = lines.join('\n');
    } else {
      json = JSON.stringify(items, null, 2);
    }
    return json;
  }

  // skip verification if opts.overwrite:true
  if (!opts.overwrite && fs.existsSync(filename)) {
    var olditems = JSON.parse(fs.readFileSync(filename));
    if (!utils.isEqualWithoutPrototypes(olditems, items)) {
      fs.writeFileSync('bad-olditems.json', JSON.stringify(olditems, null, 2));
      fs.writeFileSync('bad-newitems.json', JSON.stringify(items, null, 2));
      throw new Error('sink.file.write: verify identical: overwrite prevented: ' + filename + ' ' + JSON.stringify(opts));
    } else {
      if (opts.log) {
        var json = makeJSON();
        var numItems = (items.length) ? items.length : 1;
        var msg = util.format('md5(%s):%s %si %sMB checked', path.basename(filename), utils.md5(json), numItems, (json.length / 1024 / 1024).toFixed(2));
        utils.logStamp(msg)
      }
    }
  } else {
    var json = makeJSON();
    var dir = path.dirname(filename);
    mkdirp.sync(dir);
    fs.writeFileSync(filename, json);
    if (opts.log) {
      var numItems = (items.length) ? items.length : 1;
      var msg = util.format('md5(%s):%s %si %sMB', path.basename(filename), utils.md5(json), numItems, (json.length / 1024 / 1024).toFixed(2));
      utils.logStamp(msg)
    }
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

  // could turnoff verification
  write(filename, items);

}

// TODO: change API to .read/.write
exports = module.exports = {
  dataDirname: dataDirname,
  write: write,
  writeByUserStamp: writeByUserStamp
};
