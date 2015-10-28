"use strict";

// Pump redux to pouchdb

// dependencies - core-public-internal
var fs = require('fs');
var util = require('util');
var path = require('path');
var crypto = require('crypto');
var mkdirp = require('mkdirp');
var Promise = require('bluebird');
var _ = require('lodash');
var utils = require('./lib/utils');
var srcFile = require('./lib/source/file');
var delta = require('./lib/delta');

// globals
var allCredentials = require('./credentials.json');

//  move to logging module (?loggly)
var log = console.error;

//  move to logging module (as Factory?)
function verboseErrorHandler(shouldRethrow) {
  return function errorHandler(error) {
    log('error', error);
    if (shouldRethrow) {
      throw (error);
    }
  };
}

var lastStamp = null;

function progress(item) {
  var day = item.__stamp.substr(0, 10);
  var logit = (day !== lastStamp);
  if (logit) {
    log('--iteration stamp:', [item.__user, item.__stamp]);
    lastStamp = day;
  }
}

var accsByUserByType = {};

function getAccumulator(item) {
  var __user = item.__user;
  var __type = item.__type;
  // log('getAccumulator', __user, __type);
  if (!accsByUserByType[__user]) {
    accsByUserByType[__user] = {};
  }
  if (!accsByUserByType[__user][__type]) {
    accsByUserByType[__user][__type] = new delta.AccumulatorByUuid();
  }
  return accsByUserByType[__user][__type];
}

var itemsByUserByType = {};

function getItems(item) {
  var __user = item.__user;
  var __type = item.__type;
  // log('getAccumulator', __user, __type);
  if (!itemsByUserByType[__user]) {
    itemsByUserByType[__user] = {};
  }
  if (!itemsByUserByType[__user][__type]) {
    itemsByUserByType[__user][__type] = [];
  }
  return itemsByUserByType[__user][__type];
}

function itemHandler(credentials, stamp, file, item) {
  progress(item);

  // append
  getItems(item).push(item);

  var accByUUID = getAccumulator(item);
  var changeCount = accByUUID.merge(item);
  if (!changeCount) {
    return Promise.resolve(false);
  }
  return Promise.resolve(true);
}

function sortAndSave(_user, _type, history) {
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
  var outfile = util.format('history-%s-%s.json', _user, _type);
  save(sorted, outfile);
}

function save(thing, outfile) {
  var json = JSON.stringify(thing, null, 2);
  fs.writeFileSync(outfile, json);
  log('md5(%s):%s %sMB', path.basename(outfile), md5(json), (json.length / 1024 / 1024).toFixed(2));
}
function saveLines(thing, outfile) {
  if (!Array.isArray(thing)) {
    console.log('saveLines:thing is not an array')
    process.exit(-1)
  }
  // var json = JSON.stringify(thing);
  var lines=[];
  thing.forEach(function(el){
    lines.push(JSON.stringify(el))
  });
  var json = lines.join('\n')
  fs.writeFileSync(outfile, json);
  log('md5(%s):%s %sMB', path.basename(outfile), md5(json), (json.length / 1024 / 1024).toFixed(2));
}

function md5(str) {
  var hash = crypto.createHash('md5').update(str).digest('hex');
  return hash;
}

var batchStamp = utils.stamp().substr(0,10);
function saveRollups(_user,_type){
  // var _stamp = utils.stamp('second');
  var _stamp = batchStamp;
  var outfile = util.format('data/rollup/byUserStamp/%s/%s/rollup-%s-%s.json', _user, _stamp, _user, _type);
  var dir = path.dirname(outfile);
  mkdirp.sync(dir);
  save(itemsByUserByType[_user][_type], outfile);
  // delete itemsByUserByType[_user][_type];
}

function saveRollupsLines(_user,_type){
  // var _stamp = utils.stamp('second');
  var _stamp = batchStamp;
  var outfile = util.format('data/rollup/byUserStamp/%s/%s/rollup-%s-%s.jsonl', _user, _stamp, _user, _type);
  var dir = path.dirname(outfile);
  mkdirp.sync(dir);
  saveLines(itemsByUserByType[_user][_type], outfile);
  // delete itemsByUserByType[_user][_type];
}

function rollup() {
  var extra = '';
  // var extra = 'noredux'; // to switch to noredux..
  // var extra = 'rollup'; // to switch to noredux..
  return srcFile.iterator(extra, allCredentials, itemHandler, '**/*.json')
    .then(function(counts) {
      Object.keys(counts).forEach(function(name) {
        var c = counts[name];
        log('--' + extra + '-- ' + name, ' |stamps|:' + c.stamp + ' |f|:' + c.file + ' |p|:' + c.part);
      });
    })
    .then(function() {
      // return Promise.each(_.values(accsByUserByType), function(types) { // _user
      return Promise.each(_.keys(accsByUserByType), function(_user) { // _users
        var typesForUser = accsByUserByType[_user];
        return Promise.each(_.keys(typesForUser), function(_type) { // _type
          var accByUUID = typesForUser[_type];
          // log(' -accs|%s.%s|=%d', _user, _type, _.keys(accByUUID.accumulators).length);
          sortAndSave(_user, _type, accByUUID);

          saveRollups(_user,_type);
          saveRollupsLines(_user,_type);

          return Promise.resolve(true);
        });
      });
    });
}

Promise.resolve(true)
  .then(rollup)
  .then(function(){
    console.log('RSS Mem: %sMB', (process.memoryUsage().rss / 1024 / 1024).toFixed(2));
  })
  .catch(verboseErrorHandler(false));
