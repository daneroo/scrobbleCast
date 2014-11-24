"use strict";

// dependencies - core-public-internal
var fs = require('fs');
var path = require('path');

var Promise = require("bluebird");
var mkdirp = require('mkdirp');
var _ = require('lodash');

//  candidate for config
var dataDirname = 'data';

// expect to be called with 'minute','second' or no param
// return an iso-8601 string
function stamp(grain) {
  var now = new Date();
  if (grain === 'minute') {
    now.setSeconds(0);
  }
  if (!grain) {
    // iso8601, keep millis
    return now.toJSON();
  }
  // iso8601, remove millis
  return now.toJSON().replace(/\.\d{3}Z$/, 'Z');
}

// TODO: pubsub would be good
function logStamp(message) {
  console.log(stamp(), message);
}

// TODO: gonna need user id
// merge with version in index, and move to lib
// Note: Filename stamps rounded to minute
function writeResponse(base, response, optionalStamp) {

  // announce what we are doing io.file
  logStamp(base);

  var stampForFile = optionalStamp || stamp('minute');
  // Note: base may include a path like: 'podcasts/f54c667'
  // e.g. ./data/byDate/2014-...Z/pocdasts/f54c667.json
  var filename = path.join(dataDirname, 'byDate', stampForFile, [base, 'json'].join('.'));

  var dir = path.dirname(filename)
  mkdirp.sync(dir);

  var content = JSON.stringify(response, null, 2);
  fs.writeFileSync(filename, content);

  logStamp('+ ' + filename);
}

//  similar to Promise.map but implies concurrrency=1, preserves order of result array
//  *AND* calls reducer(item) in order
// TODO: move to own file/module...
function serialPromiseChainMap(arr, reducer) {
  var resultArray = [];
  return arr.reduce(function(promise, item) {
    return promise.then(function() {
      return Promise.resolve(reducer(item))
        .then(function(result) {
          resultArray.push(result);
          return resultArray;
        });
    });
  }, Promise.resolve('start'));
  // .then(function(what){
  //   console.log('serialPromiseMap what:',what.length);
  //   console.log('serialPromiseMap |resultArray|:',resultArray.length);
  //   return resultArray;
  // });
  // return Promise.resolve(resultArray);
}


var exports = module.exports = {
  stamp: stamp,
  logStamp: logStamp,
  writeResponse: writeResponse,
  serialPromiseChainMap:serialPromiseChainMap
};