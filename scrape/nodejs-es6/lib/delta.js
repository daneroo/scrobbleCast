"use strict";

// Usage: 
// Accumulator = new require(...delta.js).Accumulator
// var a = new Accuumulator()
// for (i in inputs) a.merge(i);
// --> a.merged, a.changes,

var _ = require('lodash');
// mine
var utils = require('./utils');

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
Accumulator.prototype.merge = function(thingToMerge, tagsForChangeSet) {
  // assume the objects are all shallow... (no nested properties for now)
  var stamp = tagsForChangeSet.stamp;
  var from = this.merged;
  var to = thingToMerge;
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
      // if (op && 'del' !== op) {
      if (op && 'chg' === op) {
        changes.push({
          op: op,
          key: key,
          from: f,
          to: t
        });
      }
    });

    if (changes.length) {
      console.log('|Δ|', changes.length, tagsForChangeSet);
      var record = _.merge({}, tagsForChangeSet, {
        changes: changes
      });
      this.history.push(record);
    }

    if (stamp) {
      this.lastUpdated = stamp;
    }
    // don't modify the from, make a copy.
    this.merged = _.merge({}, from, to);
  }
  if (stamp && !this.firstSeen) {
    this.firstSeen = stamp;
  }
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

AccumulatorByUuid.prototype.mergeMany = function(thingsToMerge, uuidProperty, stamp, source) {
  var commonTagsForChangeSet = {
    stamp: stamp, // always include or only if defined?
    source: source
  };

  var self = this;
  thingsToMerge.forEach(function(thingToMerge) {

    var uuid = thingToMerge[uuidProperty];
    var acc = self.getAccumulator(uuid);
    var tagsForChangeSet = _.merge({}, commonTagsForChangeSet, {
      uuid: uuid,
    });
    // decorate with titles - for debugging
    if (thingToMerge.title) {
      tagsForChangeSet.title = thingToMerge.title;
    }

    acc.merge(thingToMerge, tagsForChangeSet);
  });
};



var exports = module.exports = {
  Accumulator: Accumulator,
  AccumulatorByUuid: AccumulatorByUuid
};