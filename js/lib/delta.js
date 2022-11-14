// Usage:
// Accumulator = new require(...delta.js).Accumulator
// var a = new Accumulator()
// for (i in inputs) a.merge(i);
// --> a.merged, a.changes,

// dependencies - core-public-internal
const path = require('path')
const util = require('util')
const _ = require('lodash')
const sinkFile = require('./sink/file')

// This is to remove noise from comparison
//  -destructive if not cloned...(param?)
// Some fields:
// * is_deleted, starred, (is_video ?) number<->boolean
// * duration, played_up_to, playing_status null <-> number
// Conclusion:
// cast boolean field to their truthy value
// omit null values from comparison
//   which means that we may not have a merged value for these (duration)
function normalize(thing) {
  // clone thing - or NOT
  // if (param.clone)
  // thing = _.merge({}, thing);
  // thing = _.clone(thing);

  // cast to boolean if !undefined
  const booleanFields = ['is_deleted', 'starred', 'is_video']
  booleanFields.forEach(function (field) {
    if (!_.isUndefined(thing[field])) {
      if (!_.isBoolean(thing[field])) {
        // console.log('*** normalized !!',field,thing[field],!!thing[field]);
        thing[field] = !!thing[field]
      }
    }
  })

  // omit field if null
  const nullableFields = ['duration', 'played_up_to', 'playing_status']
  nullableFields.forEach(function (field) {
    // cast to boolean if !undefined
    if (_.isNull(thing[field])) {
      // console.log('*** normalized --',field,thing[field]);
      delete thing[field]
    }
  })

  // convert size field to Integer (if not null, and parseable as int)
  // api v2 has size as string for 03-new_releases and 04-in_progress
  if ('size' in thing && thing.size !== null) {
    if (!Number.isInteger(thing.size)) {
      const parsed = parseInt(thing.size, 10)
      if (!isNaN(parsed)) {
        thing.size = parsed
      } else {
        console.error(
          'Size NaN:',
          thing.__stamp,
          thing.__sourceType,
          thing.size,
          typeof thing.size
        )
      }
    }
  }
  // return normalized modified object
  return thing
}

// utility - exposed
// returns a changeset
function compare(from, to) {
  // TODO: shortcut for: from.uuid !== to.uuid
  // TODO: actually this could use the changeset stuff from level too.(later)

  // first normalize the operands (booleans and nullables)
  // from = normalize(from);
  // to = normalize(to);

  const changes = []
  if (!_.isEqual(from, to)) {
    const toKeys = _.keys(to)
    const fromKeys = _.keys(from)
    const allKeys = _.union(fromKeys, toKeys)

    allKeys.forEach(function (key) {
      const f = from[key]
      const t = to[key]
      const change = {
        key
      }
      if (_.isUndefined(f)) {
        // new key
        _.merge(change, {
          op: 'new',
          to: t
        })
        // console.log('--new key', key);
      } else if (_.isUndefined(t)) {
        // deleted key
        _.merge(change, {
          op: 'del',
          from: f
        })
        // console.log('--del key', key);
      } else if (!_.isEqual(f, t)) {
        _.merge(change, {
          op: 'chg',
          from: f,
          to: t
        })
        // console.log('--chg:', key, f, t)
      }

      // ignore deletions...
      // or maybe specific ones? (podcast_id)
      // if (change.op) {
      // if (change.op && 'chg' === change.op) { // only op:chg
      if (change.op && change.op !== 'del') {
        // op in {new,chg}
        changes.push(change)
      }
    })
  }
  return changes
}

// Constructor
function Accumulator() {
  // this.options = _.merge({},defaultOptions,options);
  this.meta = {
    __firstSeen: false,
    __lastUpdated: false
  }
  this.history = {} // array of changesets
}

Accumulator.prototype.appendHistory = function (
  changes,
  __stamp,
  __sourceType
) {
  if (!changes || !changes.length) {
    return
  }
  const self = this
  const h = this.history
  // var ignoredChangeKeys = ['url']; // for sure: too much dns noise
  //  other noisy fields
  // var ignoredChangeKeys = ['url', 'uuid', 'title', 'published_at', 'size', 'duration', 'file_type', 'podcast_id', 'id', 'podcast_uuid'];
  // could also include thumbnail_url for __type:podcast
  // var ignoredChangeKeys = ['url', 'uuid', 'title', 'published_at', 'size', 'duration', 'file_type', 'podcast_id', 'id', 'podcast_uuid', 'thumbnail_url'];
  // keep uuid!
  const ignoredChangeKeys = [
    'url',
    'title',
    'published_at',
    'size',
    'duration',
    'file_type',
    'podcast_id',
    'id',
    'podcast_uuid',
    'thumbnail_url'
  ]

  changes.forEach(function (change) {
    // op,key,from,to
    if (_.contains(ignoredChangeKeys, change.key)) {
      return
    }

    // we only record __lastUpdated if:
    // we are considering a pertinent field (not ignored)
    // and consider insertion order (last==max)
    if (!self.meta.__lastUpdated || __stamp > self.meta.__lastUpdated) {
      self.meta.__lastUpdated = __stamp
    }

    // we only record __lastPlayed if:...
    if (change.key === 'played_up_to' && change.to > 0) {
      if (!self.meta.__lastPlayed || __stamp > self.meta.__lastPlayed) {
        self.meta.__lastPlayed = __stamp
      }
    }

    // log the sourceType for the change
    h.__sourceType = h.__sourceType || {}
    h.__sourceType[__stamp] = __sourceType

    // log the actual change for key.
    h[change.key] = h[change.key] || {}
    h[change.key][__stamp] = change.to
  })
  this.meta.__changeCount = _.keys(h.__sourceType).length
}

// class methods
// Accumulates (merges) and returns changes
Accumulator.prototype.merge = function (item) {
  // assume the objects are all shallow... (no nested properties for now)
  // -clone item,
  // -normalize attributes,
  // -delete __stamp,__sourceType property for compare

  const from = this
  const to = normalize(_.clone(item))
  // no need to delete __user, and __type, but will make compare faster.
  delete to.__type
  delete to.__sourceType
  delete to.__user
  delete to.__stamp

  // old sanity check, from a previous format.
  if (item.__type === 'episode' && !to.podcast_uuid) {
    console.log('Accumulator.merge: no podcast_uuid for episode:', item)
    throw new Error(
      'Accumulator.merge: no podcast_uuid for episode:' + JSON.stringify(item)
    )
  }
  // end of special fix check

  // always merge __type, and __user
  _.merge(this.meta, {
    __type: item.__type,
    __user: item.__user
  })
  // update meta.__firstSeen
  if (!this.meta.__firstSeen || item.__stamp < this.meta.__firstSeen) {
    _.merge(this.meta, {
      __firstSeen: item.__stamp
    })
  }

  const changes = compare(from, to)
  // rewrite compare to make this smoother
  this.appendHistory(changes, item.__stamp, item.__sourceType)

  // accumulate new values
  // TODO what if stamp < __lastUpdated ??
  _.merge(this, to)

  // delete and re-attach the history attribute: makes it appear at the end of the object (usually)
  const h = this.history
  delete this.history
  this.history = h

  return changes
}

// need a new name:
// options may include : uuid, ignoreDelete, ..
function AccumulatorByUuid(/* options */) {
  this.accumulators = {} // by uuid
}

AccumulatorByUuid.prototype.getAccumulator = function (uuid) {
  if (!this.accumulators[uuid]) {
    this.accumulators[uuid] = new Accumulator({
      uuid
    })
  }
  return this.accumulators[uuid]
}

AccumulatorByUuid.prototype.merge = function (item) {
  const acc = this.getAccumulator(item.uuid)
  const changes = acc.merge(item)
  const changeCount = changes.length
  return changeCount
}

AccumulatorByUuid.prototype.sortAndSave = function (_user, _type) {
  // console.log('|' + outfile + '|=', _.size(history.accumulators));
  // just write out the accumulators dictionary, it is the only attribute!
  const sorted = _.sortBy(this.accumulators, function (item) {
    // should this use sortByAll ? not in 2.4.2
    // careful sorting by [__changeCount], compare by string when returning an array
    // this sorts by a numerically
    // _.sortBy([{a:1},{a:2},{a:3},{a:11},{a:12}],function(item){return item.a;});
    // this sorts a lexicographically
    // _.sortBy([{a:1,b:'a'},{a:2,b:'a'},{a:3,b:'a'},{a:11,b:'a'},{a:12,b:'a'}],function(item){return [item.a,item.b];})
    // return [item.meta.__changeCount,item.meta.__lastUpdated, item.uuid];

    // sort by lastUpdated,uuid (for uniqueness)
    return [item.meta.__lastUpdated, item.uuid]
  }).reverse()

  const outfile = path.join(
    sinkFile.dataDirname,
    util.format('history-%s-%s.json', _user, _type)
  )

  sinkFile.write(outfile, sorted, {
    overwrite: true,
    log: true
  })
}

// need a new name:
// Convenience to get AccByUuid per type (podcast/episode)
function AccumulatorByTypeByUuid(/* options */) {
  this.accumulatorsByType = {} // by uuid
}

AccumulatorByTypeByUuid.prototype.getAccumulatorByUuidForType = function (
  type
) {
  if (!this.accumulatorsByType[type]) {
    this.accumulatorsByType[type] = new AccumulatorByUuid()
  }
  return this.accumulatorsByType[type]
}

AccumulatorByTypeByUuid.prototype.merge = function (item) {
  const accByUuid = this.getAccumulatorByUuidForType(item.__type)
  const changeCount = accByUuid.merge(item) // already returns changeCount
  return changeCount
}

AccumulatorByTypeByUuid.prototype.sortAndSave = function (_user) {
  const self = this
  Object.keys(this.accumulatorsByType).forEach(function (_type) {
    self.getAccumulatorByUuidForType(_type).sortAndSave(_user, _type)
  })
}

exports = module.exports = {
  normalize,
  compare,
  Accumulator,
  AccumulatorByUuid,
  AccumulatorByTypeByUuid
}
