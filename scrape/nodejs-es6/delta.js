"use strict";

// High level,
// load podcasts/episodes (as needed)
// for each file in (new_releases, then in_progress)
//   for each episode in file.episodes
//     compare episode with known podcats/episode (if exists)


var fs = require('fs');
var path = require('path');
// var mkdirp = require('mkdirp');
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
var podcasts = loadJSON('podcasts.json').podcasts;
// console.log(podcasts.length,podcasts[0]);
var podcastsByUuid = _.groupBy(podcasts, 'uuid');
// console.log(podcastsByUuid);
// var podcastUuids = _.pluck(podcasts, 'uuid');
// console.log(podcastUuids);

var allEpisodesByUuid = {
  // podcast_uuid: {
  //   episode_uuid: {epidode_itself}  
  // }
};

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
    console.error('episodes not found for:', podcast_uuid, err);
    console.error(' **creating empty Array to cache negative result');
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

// should return merged (prefer from)
function delta(from,to,stamp){
  if (_.isEqual(from,to)){
    console.log ('no differences');
    return from;
  }
  // key differences (shoulf not care about deleted keys, only new ones ?)
  // new keys  
  _.difference(_.keys(to), _.keys(from)).forEach(function(key){
    console.log('--new key',key);
  });
  // deleted keys
  // _.difference(_.keys(from), _.keys(to)).forEach(function(key){
  //   console.log('--deleted key',key);
  // });

  // console.log ('has value differences?');
  // console.log('from',from);
  // console.log('to',to);
  _.merge(from,to,function(a,b){
    if (!_.isEqual(a,b)){
      // TODO find the property name so we can log history
      console.log('-- a != b',a,b);
    }
  })

  // var a = { 'a': 1, 'b': 2, 'c': 3 };
  // var b = { 'c': 3, 'd': 4, 'e': 5 };
  // _.difference(_.keys(a), _.keys(b)); // ['a', 'b']
}

function handleEpisodeUpdate(file) {
  // console.log('do something with', file);
  var stamp = file.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z/);
  if (stamp && stamp.length) {
    // console.log('stamp.match',JSON.stringify(stamp));
    stamp = new Date(stamp[0]);
  }
  var episodes = loadJSON(file).episodes;
  // console.log('in_progress',stamp,episodes.length);
  episodes.forEach(function(episode) {
    // console.log('in_progress',stamp,episode);

    // possible unknown pocast
    // var podcast = podcastsByUuid[episode.podcast_uuid];
    // if (!podcast) {
    //   console.log('podcast not found for episode:', episode);
    // }

    // possible unknown pocast or episode...
    var knownEpisodes = loadEpisodesForPodcast(episode.podcast_uuid);
    if (knownEpisodes[episode.uuid]) {
      console.log('delta', episode.uuid);
      delta(knownEpisodes[episode.uuid],episode,stamp);

    } else {
      console.log('new Episode', episode.uuid);
      knownEpisodes[episode.uuid] = episode;
    }
  });
}

find('new_releases*.json')
  .then(function(files) {
    files.forEach(handleEpisodeUpdate)
  });
find('in_progress*.json')
  .then(function(files) {
    files.forEach(handleEpisodeUpdate)
  });