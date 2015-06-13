'use strict';

// Usage:
// Accumulator = new require(...delta.js).Accumulator
// var a = new Accuumulator()
// for (i in inputs) a.merge(i);
// --> a.merged, a.changes,

var _ = require('lodash');

// This is to remove noise from comparison
//  -destructive if not cloned...(param?)
// Some fields:
// * is_deleted, starred, (is_video ?) number<->boolean
// * duration, played_up_to, playing_status null <-> number
// Conclusion:
// cast boolean fiels to their truthy value
// omit null values from comparison
//   which means that we may not have a merged value for these (duration)
function normalize(thing) {
  // clone thing - or NOT
  // if (param.clone)
  // thing = _.merge({}, thing);
  // thing = _.clone(thing);

  // cast to boolean if !undefined
  var booleanFields = ['is_deleted', 'starred', 'is_video'];
  booleanFields.forEach(function(field) {
    if (!_.isUndefined(thing[field])) {
      if (!_.isBoolean(thing[field])) {
        // console.log('*** normalized !!',field,thing[field],!!thing[field]);
        thing[field] = !!thing[field];
      }
    }
  });

  // omit field if null
  var nullableFields = ['duration', 'played_up_to', 'playing_status'];
  nullableFields.forEach(function(field) {
    // cast to boolean if !undefined
    if (_.isNull(thing[field])) {
      // console.log('*** normalized --',field,thing[field]);
      delete thing[field];
    }
  });
  // return normalized modified object
  return thing;
}

// utility - exposed
// returns a changeset
function compare(from, to) {
  // TODO: shortcut for: from.uuid !== to.uuid
  // TODO: actually this could use the changeset stuff from level too.(later)

  // first normalize the operands (booleans and nullables)
  // from = normalize(from);
  // to = normalize(to);

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
      // if (op && 'chg' === op) { // only op:chg
      if (op && 'del' !== op) { // op in {new,chg}
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
  this.merged = {meta:{}};
  this.history = []; // array of changesets
}

// class methods
// Accumulates (merges) and returns changes
Accumulator.prototype.merge = function(item) {
  // assume the objects are all shallow... (no nested properties for now)
  // -clone item,
  // -normalize attributes,
  // -delete __stamp,__sourceType property for compare
  var meta = {
    __type: item.__type,
    __sourceType: item.__sourceType,
    __user: item.__user,
    __stamp: item.__stamp,
  }

  var stamp = item.__stamp;
  var from = this.merged;
  var to = normalize(_.clone(item));
  // no need to delete __user, and __type, but will make compare faster.
  delete to.__type;
  delete to.__sourceType;
  delete to.__user;
  delete to.__stamp;

  if (item.__type === 'episode' && !to.podcast_uuid) {
    console.log('Accumulator.merge: no podcast_uuid for episode:', item);
    throw (new Error('Accumulator.merge: no podcast_uuid for episode:' + JSON.stringify(item)));
  }
  // end of special fix check

  if (stamp && !this.firstSeen) {
    this.firstSeen = stamp;
    // could compare to epoch (start of import), and set to published date - if stamp == epoch
    this.lastUpdated = stamp; // initial value
  }

  var changes = compare(from, to);
  if (changes.length) {
    // console.log('|Δ|', changes.length, keyedThing.key);
    var record = _.merge({}, {
      __stamp: stamp,
      __sourceType: item.__sourceType,
      changes:changes
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

AccumulatorByUuid.prototype.merge = function(item) {

  var acc = this.getAccumulator(item.uuid);
  var changes = acc.merge(item);
  var changeCount = changes.length;
  return changeCount;
};

exports = module.exports = {
  normalize: normalize,
  compare: compare,
  Accumulator: Accumulator,
  AccumulatorByUuid: AccumulatorByUuid
};
