"use strict";

// High level,
// load podcasts/episodes (as needed)
// for each file in (new_releases, then in_progress)
//   for each episode in file.episodes
//     compare episode with known podcats/episode (if exists)


var fs = require('fs');
var path = require('path');
var mkdirp = require('mkdirp');
var Promise = require("bluebird");
var glob = require("glob");
var pglob = Promise.promisify(glob);
var _ = require('lodash');
var level = require('level');
var utils = require('./lib/utils');
var delta = require('./lib/delta');

// globals
// external data for creds.
var dataDirname = 'data';
var levelDBName = './mydb';
var db = level(levelDBName, {
  valueEncoding: 'json'
});


function resolve(file) {
  return path.resolve(dataDirname, file);
}

// TODO: make these Async/Promised
function loadJSON(file) {
  var result = require(resolve(file));
  return result.episodes || result.podcasts || result;
}

function confirmSorted(files) {
  var sorted = true;
  var lastFile;
  files.forEach(function(file) {
    if (lastFile) {
      var ok = file > lastFile;
      if (!ok) {
        console.log('***********', lastFile, file);
        sorted = false;
      }
    }
    lastFile = file;
  });
  if (!sorted) {
    throw (new Error('files are not sorted'));
  }
  return files;
}

function find(pattern) {
  return pglob(pattern, {
      cwd: dataDirname
    })
    .then(function(files) {
      console.log('pglob.in_progress %s found: %d files', pattern, files.length);
      return files;
    })
    .then(confirmSorted)
    .catch(function(err) {
      // log and rethrow
      console.log('pglob.in_progress error:', err);
      throw err;
    });
}


function stampFromFile(file) {
  var stamp = file.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z/);
  if (stamp && stamp.length) {
    stamp = new Date(stamp[0]);
    stamp.setSeconds(0);
    stamp = stamp.toJSON().replace(/\.\d{3}Z$/, 'Z');
  }
  return stamp;
}

// this fetches the previous key from level, (if it matches the file)
// used to compare content
// This could all be done with level-path..
function getPrevious(file) {
  var prefeixRE = /^byDate\/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z/;
  return new Promise(function(resolve, reject) {
    var found = null;
    db.createReadStream({
        lt: file,
        reverse: true,
        limit: 1
      })
      .on('data', function(data) {
        // check if keys match enough..
        //  but if the contents match the wrong key: so be it for now - not likely!!
        // console.log(data.key, ' < ', file);
        // should match up to file / not stamp
        // byDate/2014-11-20T00:00:00Z/02-podcasts/17620ce0-77b4-0130-0031-723c91aeae46.json  
        // byDate/2014-11-20T00:00:00Z/02-podcasts/1dbc2230-2b82-012e-0915-00163e1b201c.json
        if (data.key) {
          var prevNoStamp = data.key.replace(prefeixRE, '');
          var fileNoStamp = file.replace(prefeixRE, '');
          if (prevNoStamp === fileNoStamp) {
            console.log(prevNoStamp, ' === ', fileNoStamp);
            resolve(data.value);
          }
          console.log(prevNoStamp, ' =!= ', fileNoStamp);
        }
        // if key is not a match, then don't return a previous
        resolve(null);
      })
      .on('error', function(err) {
        reject(error);
      })
      //  do I need both close and end.. at least promises cant be resolved twice
      .on('end', function() {
        // console.log('getPrevious end');
        resolve(found);
      })
      // close is not always called
      .on('close', function() {
        // console.log('getPrevious close');
        resolve(found);
      });
  });
}

// split the save and compareWithPrevious:boolean parts
function levelSave(file, thingsToMerge) {
  return getPrevious(file)
    .then(function(prev) {

      // TODO: filter changes (!del, !falso<->0,..)
      if (prev) {
        if (!prev.podcast_uuid) { // check for uuid fix.
          console.log('::prev missing podcast_uuid ', file);
        }
        var changes = delta.compare(prev, thingsToMerge);
        console.log('|Δ|', changes.length);
        if (changes.length === 0) {
          console.log('found duplicate - skip save ', file);
          return "Skipped duplicate: " + file;
        }
      }
      //  perform save
      return new Promise(function(resolve, reject) {
        db.put(file, thingsToMerge, function(error) {
          if (error) {
            return reject(error);
          } else {
            return resolve(file);
          }
        });
      });
    }); // then
}

function fetchAndSave(file) {

  var thingsToMerge = loadJSON(file);
  var stamp = stampFromFile(file);
  var source = file;

  if (file.match(/01-/)) {
    console.log('|podcasts|', thingsToMerge.length, file);
  } else {
    console.log('|episodes|', thingsToMerge.length, file);
  }
  // if (thingsToMerge.length === 0) {
  //   console.log('|things|==0 nothing to do. ', thingsToMerge.length, file);
  //   return file;
  // }
  return levelSave(file, thingsToMerge);
}

function dump() {
  return new Promise(function(resolve, reject) {
    var count = 0;
    db.createReadStream()
      .on('data', function(data) {
        console.log(data.key, '=', data.value.length);
        count++;
      })
      .on('error', function(err) {
        console.log('Oh my!', err);
        reject(err);
      })
      .on('close', function() {
        console.log('Stream closed');
        resolve('Stream closed count:', count);
      })
      .on('end', function() {
        console.log('Stream ended count:', count);
        resolve('Stream ended');
      });
  });

}
find('byDate/**/*.json')
  .then(function(files) {
    utils.logStamp('Starting:Level ' + files.length);

    return Promise.map(files, fetchAndSave, {
        concurrency: 1
      })
      .then(function(files) {
        console.log('Level:saved |files|', files.length);
        return files;
      });

  })
  .then(function() {
    return dump();
  })
  .then(function(dumpCode) {
    console.log('dump returned:', dumpCode);
    return new Promise(function(resolve, reject) {
      db.close(function(err) {
        if (err) {
          reject(err);
        }
        resolve('Closed')
      });
    });
  })
  .then(function(closeCode) {
    console.log('close returned:', closeCode);

    return new Promise(function(resolve, reject) {
      // db.repair is deprecated - find leveldown...
      var leveldown = require('./node_modules/level/node_modules/leveldown/');
      leveldown.repair(levelDBName, function(err) {
        if (err) {
          reject(err);
        }
        resolve('Repaired')
      });
    });
  })
  .then(function(repairCode) {
    console.log('repair returned:', repairCode);
  })
  .catch(function(error) {
    console.error('Error:Level', error);
    utils.logStamp('Error:Level ' + error);
  });