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
function getPrevious(key) {
  // console.log('<',key);  
  var removeAfterStampRE = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z.*/;
  return new Promise(function(resolve, reject) {
    var found = null;
    db.createReadStream({
        lt: key,
        reverse: true,
        limit: 1
      })
      .on('data', function(data) {
        // check if keys match enough..
        //  but if the contents match the wrong key: so be it for now - not likely!!
        // console.log(data.key, ' < ', key);
        // should match up to key / not stamp
        // - /podcast/<podast_uuid>/<stamp>/01-podcasts <-source type (url)
        // - /podcast/<podast_uuid>/episode/<episode_uuid_uuid>/<stamp>/0[234]-type <-source type 
        // - /episode/<episode_uuid_uuid>/<stamp>/0[234]-type <-source type 

        if (data.key) {
          var prevPrefix = data.key.replace(removeAfterStampRE, '');
          var keyPrefix = key.replace(removeAfterStampRE, '');
          // console.log('prev', prevPrefix, data.key);
          // console.log(' key', keyPrefix, key);
          if (prevPrefix === keyPrefix) {
            // console.log(prevPrefix, ' === ', keyPrefix);

            found = data.value;
            resolve(found);
          } else {
            // console.log(prevPrefix, ' =!= ', keyPrefix);
          }
        }
        // if key is not a match, then don't return a previous
        resolve(null);
      })
      .on('error', function(err) {
        reject(error);
      })
      //  do I need both close and end.. at least promises cant be resolved thrice
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

// a single episode/podcast
function diffAndSaveOne(keyedThing) {
  var key = keyedThing.key;
  var thing = keyedThing.value;
  return getPrevious(key)
    .then(function(prevThing) {

      // TODO: filter changes (!del, !falso<->0,..)
      if (prevThing) {
        if (!prevThing.podcast_uuid) { // check for uuid fix.
          //  unless you are a podcast (not an episode)
          if (!key.match(/01-podcasts/)) {
            console.log('::prevThing missing podcast_uuid ', key);
            throw new Error('prevThing missing podcast_uuid')
          }
        }
        var changes = delta.compare(prevThing, thing);
        console.log('|Δ|', changes.length);
        if (changes.length === 0) {
          console.log('found duplicate - skip save ', key);
          return "Skipped duplicate: " + key;
        }
      }
      // new content - persist away - perform save
      return new Promise(function(resolve, reject) {
        // console.log('about to save',key,thing);
        db.put(key, thing, function(error) {
          if (error) {
            return reject(error);
          } else {
            return resolve(key);
          }
        });
      });
    }); // then
}


// Key (path) definitions
// - /podcast/<podast_uuid>/<stamp>/01-podcasts <-source type (url)
// - /podcast/<podast_uuid>/episode/<episode_uuid_uuid>/<stamp>/0[234]-type <-source type 
// - /episode/<episode_uuid_uuid>/<stamp>/0[234]-type <-source type 
// example input patterns
// data/byDate/2014-11-07T08:34:00Z/02-podcasts/2cfd8eb0-58b1-012f-101d-525400c11844.json
// data/byDate/2014-11-05T07:40:00Z/03-new_releases.json
// data/byDate/2014-11-05T07:40:00Z/04-in_progress.json
var count = 0;

function makeKeys(file, thingsToMerge) {
  if (thingsToMerge.length === 0) return;

  // var path = file.match(/01-podcasts.json$/) ? '/podcast' : '/podcast/episode';
  // var path = file.match(/01-podcasts.json$/) ? '/podcast' : '/podcast/episode';
  var stamp = stampFromFile(file);
  // match the sourceType and optionally the podcast_uuid for 02-podcasts (old)
  var match = file.match(/(01-podcasts|02-podcasts|03-new_releases|04-in_progress)(\/(.*))?\.json/);
  var sourceType = match[1];
  var podcast_uuid = match[3]
  console.log('--file match:', sourceType, podcast_uuid);

  // extra assert (02- fix)
  if (sourceType === '02-podcasts' && !podcast_uuid) {
    throw (new Error('-no podcast_uuid!'));
  }
  var keyedThings = thingsToMerge.map(function(thing) {
    if (!thing.uuid) {
      throw (new Error('no uuid!'))
    }
    var key;
    if (sourceType === '01-podcasts') {
      // assert stuff
      key = ['/podcast', thing.uuid, stamp, sourceType].join('/');
    } else {
      count++;
      if (!thing.podcast_uuid) {
        if (!podcast_uuid) {
          console.log('XXXX', file, sourceType, match);
          throw (new Error('+no podcast_uuid! for file:' + file));
        }
        // perform the fix
        thing.podcast_uuid = podcast_uuid;
      }
      key = ['/podcast', thing.podcast_uuid, 'episode', thing.uuid, stamp, sourceType].join('/');
    }
    if (count % 1000 === 0) {
      console.log('count', count, key, file);
    }
    return {
      key: key,
      value: thing
    };
  });
  console.log('total count', count);
  return keyedThings;
}

// split the save and compareWithPrevious:boolean parts
function levelSave(file, thingsToMerge) {
  // console.log('levelSave:', file);
  var keyedThings = makeKeys(file, thingsToMerge);
  return Promise.map(keyedThings, diffAndSaveOne, {
      concurrency: 1
    })
    .then(function(result) {
      console.log('saved', result);
    });
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
  if (thingsToMerge.length === 0) {
    console.log('|things|==0 nothing to do. ', thingsToMerge.length, file);
    return file;
  }

  return levelSave(file, thingsToMerge);
}

function dump() {
  return new Promise(function(resolve, reject) {
    var count = 0;
    db.createReadStream()
      .on('data', function(data) {
        // console.log(data.key, '=', data.value.length);
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