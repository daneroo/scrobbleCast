'use strict';

// dependencies - core-public-internal

// expect to be called with 'minute','second' or no param (millis)
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

exports = module.exports = {
  stamp: stamp,
  logStamp: logStamp,
  stampFromFile:stampFromFile
};
