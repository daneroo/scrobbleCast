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
var utils = require('./lib/utils');
var delta = require('./lib/delta');

// globals
// external data for creds.
var dataDirname = 'data';

function resolve(file) {
  return path.resolve(dataDirname, file);
}

// make these Async/Promised
function loadJSON(file) {
  var result = require(resolve(file));
  return result.episodes || result.podcasts || result;
}

// TODO: memoize these:
var podcasts;
var podcastsByUuid;
var allEpisodesByUuid = {};
var history = [];

function initialize() {
  var prefix = 'byDate/2014-11-07T08:34:00Z/';
  podcasts = loadJSON(prefix + '01-podcasts.json');
  console.log('init:|podcasts|', podcasts.length);

  podcastsByUuid = _.groupBy(podcasts, 'uuid');
  // console.log(podcastsByUuid);

  // nested lookup : this is the structure
  allEpisodesByUuid = {
    // podcast_uuid: {
    //   episode_uuid: {epidode_itself}  
    // }
  };
  history = []; // reset history
}

// return cached (accumulated value) if available
function loadEpisodesForPodcast(podcast_uuid) {
  var episodes = allEpisodesByUuid[podcast_uuid];
  if (episodes) {
    // cacheHit++;
    return episodes;
  }
  try {
    var prefix = 'byDate/2014-11-07T08:34:00Z/';

    episodes = loadJSON(path.join(prefix + '02-podcasts', podcast_uuid + '.json'));
    console.log('init:|episodes|', episodes.length);
  } catch (err) {
    console.log('episodes not found for:', podcast_uuid);
    // console.log(' **creating empty Array to cache negative result');
    episodes = [];
  }
  var episodeByUuid = _.groupBy(episodes, 'uuid');
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
  var episodes = loadJSON(file);
  console.log('stream:|episodes|', episodes.length);
  episodes.forEach(function(episode) {
    // possible unknown pocast or episode...
    var knownEpisodes = loadEpisodesForPodcast(episode.podcast_uuid);
    if (knownEpisodes[episode.uuid]) {
      var d = delta(knownEpisodes[episode.uuid], episode);
      knownEpisodes[episode.uuid] = d.merged;
      if (d.changes.length) {
        // console.log('Δ', episode.uuid, stamp, '\n', d.changes);
        var record = {
          stamp: stamp,
          kind: 'episode',
          // podcast_uuid ? if exists
          uuid: episode.uuid,
          source: file, // temporary for tracing
          changes: d.changes
        };
        console.log('episode with podcast:', episode.podcast_uuid);
        // safe lookup
        var podcast = (podcastsByUuid[episode.podcast_uuid] || [{}])[0];
        // decorate with titles

        // if we don't already have the episode title, lookit up
        if (podcast && !episode.title) {
          // safe lookup.
          episode.title = (allEpisodesByUuid[episode.podcast_uuid] || {})[episode.uuid];
        }
        if (episode.title) {
          record.episode_title = episode.title;
        }
        if (podcast && podcast.uuid) {
          record.podcast_uuid = podcast.uuid;
          if (podcast.title) {
            record.podcast_title = podcast.title;
          }
        }
        history.push(record);
      }
    } else {
      // console.log('new Episode', episode.uuid);
      knownEpisodes[episode.uuid] = episode;
    }
  });
}

// new stuff:
if (0) find('byDate/**/01-*.json')
  .then(function(files) {
    utils.logStamp('Starting new Delta (podcasts)' + files.length);

    var historyByUuid = new delta.AccumulatorByUuid();
    var pluckUuidFromProperty = 'uuid';
    files.forEach(function(file) {
      console.log('Accumulating: ' + file);
      podcasts = loadJSON(file);
      console.log('stream:|podcasts|', podcasts.length);
      var stamp = stampFromFile(file);
      var source = file;
      historyByUuid.mergeMany(podcasts, null, pluckUuidFromProperty, stamp, source);
    });
    fs.writeFileSync('podcast-history.json', JSON.stringify(historyByUuid, null, 2));
    utils.logStamp('Done new Delta (podcasts)' + files.length);
  });

// find('byDate/**/0[34]*.json')
find('byDate/**/*.json')
  .then(function(files) {
    utils.logStamp('Starting new Delta ' + files.length);

    var uuidProperty = 'uuid'; // common to all: podcasts/episodes
    var podcastHistory = new delta.AccumulatorByUuid();
    var episodeHistory = new delta.AccumulatorByUuid();

    files.forEach(function(file) {

      console.log('Accumulating: ' + file);
      var thingsToMerge = loadJSON(file);
      var stamp = stampFromFile(file);
      var source = file;

      if (file.match(/01-/)) {
        console.log('|podcasts|', thingsToMerge.length);
        podcastHistory.mergeMany(thingsToMerge, uuidProperty, stamp, source);
      } else {
        console.log('|episodes|', thingsToMerge.length);
        episodeHistory.mergeMany(thingsToMerge, uuidProperty, stamp, source);
      }
    });
    fs.writeFileSync('podcast-history.json', JSON.stringify(podcastHistory, null, 2));
    fs.writeFileSync('episode-history.json', JSON.stringify(episodeHistory, null, 2));
    utils.logStamp('Done new Delta ' + files.length);
  });


if (0) find('byDate/**/0[34]*.json')
  // find('byDate/**/0[2]*/*.json')
  .then(function(files) {
    initialize();
    files.sort();

    // console.log('byDate.files', files);
    files.forEach(handleEpisodeUpdate);
    // fs.writeFileSync('files.json', JSON.stringify(files, null, 2));

    return files;
  })
  .then(function(files) {
    fs.writeFileSync('history.json', JSON.stringify(history, null, 2));
    return files;
  })
  .then(function(files) {
    history = _.sortBy(history, ['uuid', 'stamp']);
    fs.writeFileSync('history-uuid.json', JSON.stringify(history, null, 2));
    return files;
  });