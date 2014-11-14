"use strict";

// dependencies - core-public-internal
var fs = require('fs');
var path = require('path');

var mkdirp = require('mkdirp');
var rp = require('request-promise');
var _ = require('lodash');

//  candidate for config
var dataDirname = 'data';

// TODO: pubsub would be good
function logStamp(message) {
  console.log(new Date().toJSON(), message);
}

// TODO: gonna need user id
// merge with version in index, and move to lib
// Note: Filename stamps rounded to minute
function writeResponse(base, response) {

  // remove millis, round seconds, convert to iso8601 string
  function nowMinute() {
    var stamp = new Date();
    stamp.setSeconds(0);
    return stamp.toJSON().replace(/\.\d{3}Z$/, 'Z'); // iso8601, remove millis
  }

  // announce what we are doing io.file
  logStamp(base);

  var stamp = nowMinute();
  // Note: base may include a path like: 'podcasts/f54c667'
  // e.g. ./data/byDate/2014-...Z/pocdasts/f54c667.json
  var filename = path.join(dataDirname, 'byDate', stamp, [base, 'json'].join('.'));

  var dir = path.dirname(filename)
  mkdirp.sync(dir);

  var content = JSON.stringify(response, null, 2);
  fs.writeFileSync(filename, content);

  logStamp('+ ' + filename);
}

var exports = module.exports = {
  logStamp: logStamp,
  writeResponse: writeResponse
};