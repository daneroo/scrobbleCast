"use strict";

// dependencies - core-public-internal
var Promise = require("bluebird");

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

// parse a stamp from a file/path
function stampFromFile(file) {
  var stamp = file.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z/);
  if (stamp && stamp.length) {
    stamp = new Date(stamp[0]);
    stamp.setSeconds(0);
    stamp = stamp.toJSON().replace(/\.\d{3}Z$/, 'Z');
  }
  return stamp;
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
  stampFromFile:stampFromFile,
  serialPromiseChainMap: serialPromiseChainMap
};