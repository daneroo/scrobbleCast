"use strict";

// Usage: 
// Accumulator = new require(...delta.js).Accumulator
// var a = new Accuumulator()
// for (i in inputs) a.merge(i);
// --> a.merged, a.changes,

var _ = require('lodash');
// mine
var utils = require('./utils');

// utility - exposed
// returns a changeset
function compare(from, to) {
  // TODO: shortcut for: from.uuid !== to.uuid
  // TODO: actually this could use the changeset stuff from level too.(later)

  var changes = [];
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
      // if (op && 'chg' === op) {
        changes.push({
          op: op,
          key: key,
          from: f,
          to: t
        });
      }
    });
  }
  return changes;
}


// Constructor
function Accumulator() {
  // this.options = _.merge({},defaultOptions,options);
  this.firstSeen = false; // set to stamp on first run
  this.lastUpdated = false; // set to stamp when changes detected
  this.merged = {};
  this.history = []; // array of changesets
}

// class methods
// Accumulates (merges) and returns changes
Accumulator.prototype.merge = function(keyedThing) {
  // assume the objects are all shallow... (no nested properties for now)

  var stamp = keyedThing.key.stamp;
  var from = this.merged;
  var to = keyedThing.value;
  var changes = [];

  // special fix for missing podcast_uuid in early 02-podcasts files
  //  NOW Fixed in readByDate
  // if we only see an episode with 02-* ,
  // the podcast_uuid (which is ommited in the /../find_by_podcast REST response),
  // was not originally injected into the response, it is now fixed.
  // we keep this fix here to accomodate the reading of previously grabbed scraped data
  // Description restore the missing podcast_uuid, 
  // which was encoded in the file_name, 
  //   it is available here as the 'source' attribute in the tagsForChangeSet
  if (keyedThing.key.type === 'episode' && !to.podcast_uuid) {
    console.log('Accumulator.merge: no podcast_uuid for episode:', keyedThing);
    throw (new Error('Accumulator.merge: no podcast_uuid for episode:' + JSON.stringify(keyedThing)));
  }
  // end of special fix check

  if (stamp && !this.firstSeen) {
    this.firstSeen = stamp;
    // could compare to epoch (start of import), and set to published date - if stamp == epoch
    this.lastUpdated = stamp; // initial value
  }

  var changes = compare(from, to);
  if (changes.length) {
    console.log('|Δ|', changes.length, keyedThing.key);
    var record = _.merge({}, keyedThing.key, {
      changes: changes
    });
    this.history.push(record);

    if (stamp) {
      this.lastUpdated = stamp;
    }
  }
  // don't modify the from, make a copy.
  this.merged = _.merge({}, from, to);
  return changes;
};

// need a new name:
// options may include : uuid, ignoreDelete, ..
function AccumulatorByUuid( /*options*/ ) {
  this.accumulators = {}; // by uuid  
}

AccumulatorByUuid.prototype.getAccumulator = function(uuid) {
  if (!this.accumulators[uuid]) {
    this.accumulators[uuid] = new Accumulator({
      uuid: uuid
    });
  }
  return this.accumulators[uuid];
};

AccumulatorByUuid.prototype.mergeMany = function(keyedThings) {

  var self = this;
  var changeCount = 0;
  keyedThings.forEach(function(keyedThing) {
    var acc = self.getAccumulator(keyedThing.key.uuid);
    var changes = acc.merge(keyedThing);
    changeCount += changes.length;
  });
  return changeCount;
};



var exports = module.exports = {
  compare: compare,
  Accumulator: Accumulator,
  AccumulatorByUuid: AccumulatorByUuid
};