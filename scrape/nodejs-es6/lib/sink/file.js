"use strict";

// dependencies - core-public-internal
// var fs = require('fs');
// for fs.readdirPromise
var Promise = require("bluebird");
var fs = Promise.promisifyAll(require("fs"), {
  suffix: 'Promise'
});
var path = require('path');
var mkdirp = require('mkdirp');
var utils = require('../utils');


// globals - candidate for config
var dataDirname = 'data';


//  extract keyToPath into common place.
// Target Key (path) definitions
// - /podcast/<podast_uuid>/<stamp>/01-podcasts <-source type (url)
// - /podcast/<podast_uuid>/episode/<episode_uuid>/<stamp>/0[234]-type <-source type 

function pathFromKey(key) {
  var parts = ['type', 'uuid', 'stamp', 'sourceType'];
  if (key.type === 'episode') { // prepend with podcast_uuid
    parts = ['podcast_uuid'].concat(parts);
  }
  // assertions - for key
  parts.forEach(function(part) {
    if (!key[part]) {
      console.log('pathFromKey: missing key.' + part, key);
      throw new Error('pathFromKey: missing key.' + part);
    }
  });

  var paths = parts.map(function(part) {
    return key[part];
  });

  if (key.type === 'episode') {
    paths = ['podcast'].concat(paths);
  }
  return paths.join('/');
}

// write byType
function write(keyedThing) {

  var paths = pathFromKey(keyedThing.key);
  // announce what we are doing io.file
  // utils.logStamp('writing '+paths);

  var filename = path.join(dataDirname, 'byType', [paths, 'json'].join('.'));

  var dir = path.dirname(filename)
  mkdirp.sync(dir);

  var content = JSON.stringify(keyedThing, null, 2);
  // fs.writeFileSync(filename, content);

  // utils.logStamp('wrote ' + filename);
  // console.log('+++file:',filename);
}

// deprecated - used by cron through tasks
function writeByDate(base, response, optionalStamp) {

  // announce what we are doing io.file
  utils.logStamp(base);

  var stampForFile = optionalStamp || stamp('minute');
  // Note: base may include a path like: 'podcasts/f54c667'
  // e.g. ./data/byDate/2014-...Z/pocdasts/f54c667.json
  var filename = path.join(dataDirname, 'byDate', stampForFile, [base, 'json'].join('.'));

  var dir = path.dirname(filename)
  mkdirp.sync(dir);

  var content = JSON.stringify(response, null, 2);
  fs.writeFileSync(filename, content);

  utils.logStamp('+ ' + filename);
}



// TODO: change API to .read/.write
var exports = module.exports = {
  write: write,
  writeByDate: writeByDate
};