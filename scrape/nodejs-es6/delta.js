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

// globals
// external data for creds.
var dataDirname = 'data';

function resolve(file) {
  return path.resolve(dataDirname, file);
}

var cachedNegative

function loadJSON(file) {
  return require(resolve(file));
}

// TODO: memoize these:
var podcasts;
var podcastsByUuid;
var allEpisodesByUuid = {};
var history = []; // reset history

function initialize() {
  var podcasts = loadJSON('podcasts.json').podcasts;
  // console.log(podcasts.length,podcasts[0]);

  var podcastsByUuid = _.groupBy(podcasts, 'uuid');
  // console.log(podcastsByUuid);

  // nested lookup
  allEpisodesByUuid = {
    // podcast_uuid: {
    //   episode_uuid: {epidode_itself}  
    // }
  };
  history = []; // reset history
}
initialize();

// return cached (accumulated value) if available
function loadEpisodesForPodcast(podcast_uuid) {
  var episodes = allEpisodesByUuid[podcast_uuid];
  if (episodes) {
    // cacheHit++;
    return episodes;
  }
  try {
    episodes = loadJSON(path.join('podcasts', podcast_uuid + '.json'));
  } catch (err) {
    // console.log('episodes not found for:', podcast_uuid, err);
    console.log('episodes not found for:', podcast_uuid);
    console.log(' **creating empty Array to cache negative result');
    episodes = [];
  }
  var episodeByUuid = _.groupBy(podcasts, 'uuid');
  // cache it
  allEpisodesByUuid[podcast_uuid] = episodeByUuid;
  return episodeByUuid;
}

function find(pattern) {
  return pglob(pattern, {
      cwd: dataDirname
    })
    .then(function(files) {
      console.log('pglob.in_progress %s found: %d files', pattern, files.length);
      // return _.map(files, resolve);
      return files;
    })
    .catch(function(err) {
      // not tested, Can;t think of an error...
      console.log('pglob.in_progress error:', err);
    });
}

//  could merge to into from and return changes
// but for now return
// should return merged properties, (prefer from if equal)
// should calculate and return changes
// assume the objects are all shallow... (no nested properties)
function delta(from, to) {
  var changes = [];
  var merged = from;
  if (!_.isEqual(from, to)) {
    var toKeys = _.keys(to);
    var fromKeys = _.keys(from);
    var allKeys = _.union(fromKeys, toKeys);

    allKeys.forEach(function(key) {
      var f = from[key];
      var t = to[key];
      var op;
      if (_.isUndefined(f)) { // new key
        op = 'new';
        // console.log('--new key', key);
      } else if (_.isUndefined(t)) { // deleted key
        op = 'del';
        // console.log('--del key', key);
      } else if (!_.isEqual(f, t)) {
        op = 'chg';
        // console.log('--chg:', key, f, t)
      }

      // ignore deletions... 
      // or maybe specific ones? (podcast_id)
      // if (op) {
      if (op && 'del' !== op) {
        changes.push({
          op: op,
          key: key,
          from: f,
          to: t
        });
      }
    });

    // don't modify the from, make a copy.
    merged = _.merge(_.merge({}, from), to);
  }

  // if (changes.length) {
  //   console.log('Δ', changes);
  // }
  return {
    merged: merged,
    changes: changes
  }
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

function handleEpisodeUpdate(file) {
  // console.log('do something with', file);
  var stamp = stampFromFile(file);
  var episodes = loadJSON(file).episodes;
  episodes.forEach(function(episode) {
    // possible unknown pocast or episode...
    var knownEpisodes = loadEpisodesForPodcast(episode.podcast_uuid);
    if (knownEpisodes[episode.uuid]) {
      var d = delta(knownEpisodes[episode.uuid], episode);
      knownEpisodes[episode.uuid] = d.merged;
      if (d.changes.length) {
        console.log('Δ', episode.uuid, stamp, '\n', d.changes);
        history.push({
          stamp: stamp,
          kind: 'episode',
          // podcast_uuid ? if exists
          uuid: episode.uuid,
          // source: file, // temporary for tracing
          changes: d.changes
        });
      }
    } else {
      console.log('new Episode', episode.uuid);
      knownEpisodes[episode.uuid] = episode;
    }
  });
}

// temporary sort in_progress.YYMMDD, new_release.YYY by date, then new_release before in_pro
// in progress, and new_releases, sort by order.
function sortByDateThenReverseLexico(a, b) {
  var aStamp = stampFromFile(a);
  var bStamp = stampFromFile(b);
  var diff = aStamp.localeCompare(bStamp);
  if (diff) {
    return diff;
  } else {
    // reverse lexical file name: new_release before in_progress
    return b.localeCompare(a);
  }
}

function rewrite(file) {
  console.log('-', file);
  var stamp = stampFromFile(file);
  var newfile = [file.split('.')[0], 'json'].join('.');

  var dir = path.join(dataDirname, 'byDate', stamp);
  mkdirp.sync(dir);
  newfile = path.join(dir, newfile);
  console.log('+', newfile);
  fs.writeFileSync(newfile, fs.readFileSync(path.join(dataDirname, file)));
}
find('[ni]*.json')
  .then(function(files) {
    files.sort(sortByDateThenReverseLexico);
    files.forEach(function(file) {
      console.log((file.length < 38) ? ' ' : '', file);
    });
    return files;
  })
  .then(function(files) {
    files.forEach(rewrite);
    return files;
  })
  .then(function(files) {
    files.forEach(handleEpisodeUpdate);
    return files;
  })
  .then(function(files) {
    fs.writeFileSync('history-old.json', JSON.stringify(history, null, 2));
  })
  .then(function() {
    return find('byDate/*');
  })
  .then(function(dirs) {
    // files.sort(sortByDateThenReverseLexico);
    // dirs.forEach(function(dir){
    //   console.log(dir);
    // });
    return Promise.map(dirs, function getFiles(dir) {
      console.log('find files in dir', dir);
      return find(path.join(dir, '*.json'))
        .then(function(files) {
          // so that new_release is before in_progress
          files.reverse();
          return files;
        });
    }).then(function(filesInDirs) {
      return _.flatten(filesInDirs);
    });
  })
  .then(function(files) {
    initialize();

    console.log('byDate.files', files);
    files.forEach(handleEpisodeUpdate);
    return files;
  })
  .then(function(files) {
    fs.writeFileSync('history.json', JSON.stringify(history, null, 2));
  });

// find('new_releases*.json')
//   .then(function(files) {
//     files.forEach(handleEpisodeUpdate)
//   });

// find('in_progress*.json')
//   .then(function(files) {
//     files.forEach(handleEpisodeUpdate)
//   });