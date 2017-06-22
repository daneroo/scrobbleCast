// This is the sequelize implentation of the store API
'use strict'

// pg implementation (save only)

// dependencies - core-public-internal
var Promise = require('bluebird')
var log = require('../log')
var utils = require('../utils')
const orm = require('../model/orm')
// these might be moved or exposed
var pgu = require('./pg-utils')

// var sinkFile = require('../sink/file');

// Use default from utils?
const DIGEST_ALGORITHM = 'sha256'

// Exported API
exports = module.exports = {
  init: init, // setup the database pool, ddl...
  end: end,

  // save: (item) => {}, // should return (Promise)(status in insert,duplicate,error)
  save: save,

  // saveByBatch(batchSize) // accumulates writes, must be flushed at end
  saveByBatch: saveByBatch,
  saveAll: saveAll,

  // load: (opts, handler) => {} // foreach item, cb(item);
  load: load,
  getByDigest: getByDigest,

  // above is done
  digests: digests,
  // for sync reconciliation
  getByKey: getByKey,

  remove: remove
}

// expose private methods for tests
// TODO(daneroo): is this a bad idea?
if (process.env.NODE_ENV === 'test') {
  Object.assign(exports, {
    _digest: _digest,
    _exists: _exists,
    _isErrorDuplicateDigest: _isErrorDuplicateDigest,
    _filterExisting: _filterExisting
  })
}

async function init () {
  return orm.init()
}

async function end () {
  log.debug('sequelize: Closing connections, drain the pool!')
  return orm.sequelize.close()
}

function _digest (item) {
  return utils.digest(JSON.stringify(item), DIGEST_ALGORITHM, false)
}
async function _exists (item) {
  const digest = _digest(item)
  const count = await orm.Item.count({
    where: {
      digest: digest
    }
  })
  return count === 1
}

// This detects the specific error from insertion of a duplicate item (by digest primary key)
function _isErrorDuplicateDigest (error) {
  // It seems this test is suffient
  if (error.name === 'SequelizeUniqueConstraintError') {
    // Log if other assumtions are not correct (just in case)
    if (!error.errors ||
        !error.errors.length > 0 ||
        error.errors[0].message !== 'digest must be unique' ||
        error.errors[0].path !== 'digest'
        ) {
      log.error('_isErrorDuplicateDigest', {message: error.message, name: error.name, errors: error.errors})
    }
    return true
  }
  return false
}

// TODO(daneroo): combines both checkThenSave, and saveButVerifyIfDuplicate
async function save (item) {
  // log.verbose('pg:save saving item', { user: item.__user, stamp: item.__stamp });

  // check then save
  if (await _exists(item)) {
    return true
  }

  try {
    await orm.Item.create({ item: item })
    return true
  } catch (error) {
    // saveButVerifyIfDuplicate : should never happen because of check above
    if (_isErrorDuplicateDigest(error)) {
      return true
    }
    throw error
  }

  // new benchmarks with sequelize (205k items)
  // sqlite:   checckThenSave:full             181s : sum ok
  // sqlite:   saveButVerifyIfDuplicate:full   227s : sum ok
  // postgres: checckThenSave:full             381s : sum ok
  // postgres: saveButVerifyIfDuplicate:full   378s : sum ok
}

// return a function to be used in place of save
// accumulates items for writing
// the returned function has a .flush property, which must be called at end
// e.g.
// let saver = saveByBatch(3)
// saver(item1); saver(item2); saver(item3); saver(item4);
// saver.flush(); // saves the pending items in accumulator
function saveByBatch (batchSize) {
  // default batchSize
  batchSize = batchSize || 1000
  // speed benchamarks with ~135k items, redone with helpers.insert (multi)
  // batch=2 insert:empty     85 seconds : sum ok
  // batch=10 insert:empty    55 seconds : sum ok
  // batch=100 insert:empty   52 seconds : sum ok
  // batch=100 insert:empty   52 seconds : sum ok
  // batch=1000 insert:empty  38 seconds : sum ok
  // batch=10000 insert:empty 41 seconds : sum ok

  // batch=1000 insert,each.save:half  111 seconds : sum ok
  // batch=1000 insert,each.save:half  113 seconds : sum ok

  // batch=1000 insert,each.save:full  179 seconds : sum ok

  // this is the saved item accumulator
  let tosave = []
  const flush = () => {
    // log.verbose('-flush', tosave.length);
    return saveAll(tosave)
      .then((results) => {
        tosave = []
        return results
      })
  }
  const saver = (item) => {
    tosave.push(item)
    if (tosave.length >= batchSize) {
      return flush()
    }
    return Promise.resolve(true)
  }

  // add the flush function to the returned
  saver.flush = () => {
    log.verbose('+last.flush called', tosave.length)
    return flush()
  }
  return saver
}

// returns the items which are not already present
// as determined by digest (primary key) lookup
async function _filterExisting (wrappedItemsWithDigests) {
  const digests = wrappedItemsWithDigests.map(i => i.digest)

  const existingDigests = await orm.Item.findAll({
    raw: true,
    attibutes: ['digest'],
    where: {
      digest: {
        $in: digests
      }
    }
  }).map(i => i.digest)
  // if no existing digests, return original array
  if (existingDigests.length === 0) {
    return wrappedItemsWithDigests
  }
  // console.log('existing digests', existingDigests.length)

  // make a lookup for filtering
  const exists = {}
  existingDigests.forEach(digest => {
    exists[digest] = true
  })

  const filtered = wrappedItemsWithDigests.filter(item => !exists[item.digest])

  return filtered
}

async function saveAll (items) {
  if (items.length === 0) {
    return true
  }

  const wrapped = items.map(i => ({item: i, digest: _digest(i)}))

  const needSaving = await _filterExisting(wrapped)
  if (needSaving.length === 0) {
    return true
  }
  // log.debug('filterd:', needSaving.length)

  try {
    await orm.Item.bulkCreate(needSaving)
    return true
  } catch (error) {
    // rethrow unless we know it's a duplicate digest error
    if (!_isErrorDuplicateDigest(error)) {
      log.error('saveAll:error', {message: error.message, name: error.name, errors: error.errors})
      throw error
    }
    // log.debug('saveAll: At least one duplicate digest, save each item')
  }

  // If we get here it's because we had a duplicate digest, so save each item
  for (let item of items) {
    await save(item)
  }
  return true
}

// TODO(daneroo): but might better return map[Series] or spex, or streaming query
async function load (opts, itemHandler) {
  opts = opts || {}
  const noop = async () => true // default handler (async)
  itemHandler = itemHandler || noop
  // opts.prefix = opts.prefix || ''
  if (!opts.filter.__user) {
    throw (new Error('file:load missing required opt filter.__user'))
  }

  const items = await orm.Item.findAll({
    attributes: ['item'],
    where: {
      '__user': opts.filter.__user
    },
    order: ['__user', '__stamp', '__type', 'uuid', '__sourceType']
  })

  const results = []
  for (let item of items) {
    results.push(await itemHandler(item.item))
  }
  return results
}

async function getByDigest (digest) {
  const wrapped = await orm.Item.findOne({
    attributes: ['item'],
    where: {
      digest: digest
    }
  })
  return wrapped.item
}

async function digests (syncParams) {
  syncParams = syncParams || {}
  const nmParams = {
    before: syncParams.before || '2040-01-01T00:00:00Z', // < (strict)
    since: syncParams.since || '1970-01-01T00:00:00Z'   // >= (inclusive)
  }

  const items = await orm.Item.findAll({
    raw: true,
    attributes: ['digest'],
    where: {
      '__stamp': {
        $lt: nmParams.before, // < before (strict)
        $gte: nmParams.since  // >= since (inclusive)
      }
    },
    order: [['__stamp', 'DESC'], 'digest']
  }).map(r => r.digest)

  return items
}

// ABOVE is done //////////////////////////////////

// TODO(daneroo): delete by digest
//   OK for now as these 5 fields are a primary key
function remove (item) {
  const nmParams = pgu.getNamedParametersForItem(item)
  delete nmParams.item

  // watch camelcase for __sourcetype NOT __sourceType,
  // also ES6 templates use ${var}, helper can use {}, (), [], <>, //
  const sql =
    `DELETE from items WHERE
    __user=$[__user] AND __stamp=$[__stamp]
    AND __type=$[__type] AND uuid=$[uuid]
    AND __sourcetype=$[__sourcetype]`

  // log.verbose('pg:remove deleting item', nmParams);

  // uses db.result to assert result.rowCount==1
  return pgu.db.result(sql, nmParams)
    .then(function (result) {
      if (result.rowCount !== 1) {
        log.warn('delete rowCount!=1', result)
        log.warn('delete rowCount!=1', nmParams)
      }
    })
}

// return item or null
// copied from confirmIdentical()
// not refactored because of detailed error loging in confirmIdentical()
// exposed for proactive recociliation in sync
function getByKey (item) {
  const nmParams = pgu.getNamedParametersForItem(item)
  delete nmParams.item

  // watch camelcase for __sourcetype NOT __sourceType,
  // also ES6 templates use ${var}, helper can use {}, (), [], <>, //
  const sql =
    `SELECT item FROM items
    WHERE __user=$[__user] AND __stamp=$[__stamp]
    AND __type=$[__type] AND uuid=$[uuid]
    AND __sourcetype=$[__sourcetype]`

  return pgu.db.oneOrNone(sql, nmParams)
    .then(result => {
      if (result === null || !result.item) {
        return null
      }
      return result.item
    })
}
