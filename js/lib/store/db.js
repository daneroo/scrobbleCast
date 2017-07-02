// This is the sequelize implentation of the store API
'use strict'

// pg implementation (save only)

// dependencies - core-public-internal
var log = require('../log')
var utils = require('../utils')
const orm = require('../model/orm')
// these might be moved or exposed

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

  digests: digests,
  digestOfDigests: digestOfDigests,

  remove: remove,
  removeAll: removeAll,

  // Deprecated: for sync reconciliation
  getByKey: getByKey

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
  // slequelize.close seems to be fixed for postgres now (sequelize 4.2.1)
  // https://github.com/sequelize/sequelize/commit/e239a04da62f7fa5bb127743e67da5ff0f80b756
  await orm.sequelize.close()
  log.debug('sequelize: Closed connections, drained the pool!')
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
// which accumulates items for writing
// the returned function has a .flush property, which must be called at end
// e.g.
// let saver = saveByBatch(3)
// saver(item1); saver(item2); saver(item3); saver(item4);
// saver.flush(); // saves any pending items in accumulator
function saveByBatch (batchSize) {
  // default batchSize
  batchSize = batchSize || 1000
  // tested with restore 2017-06-24
  // benchamarks with ~208k items: postgres
  // batch=10000 empty 100 seconds
  // batch=1000  empty  58 seconds <--
  // batch=100   empty  78 seconds
  // batch=1000  half   45 seconds <-- (digest like [0-7]%) inserts interleaved
  // batch=1000  half   40 seconds <-- (__stamp > '2016-02-01') All insrts at end
  // batch=10000 full   18 seconds
  // batch=1000  full   17 seconds <--
  // batch=100   full   18 seconds
  // batch=10    full   52 seconds

  // benchamarks with ~208k items: sqlite
  // batch=10000 empty  58 seconds
  // batch=1000  empty  39 seconds <--
  // batch=100   empty  57 seconds
  // batch=1000  half   26 seconds <-- (digest like [0-7]%)
  // batch=1000  half   26 seconds <-- (__stamp > '2016-02-01')
  // batch=10000 full   14 seconds
  // batch=1000  full   10 seconds <--
  // batch=100   full   12 seconds
  // batch=10    full   27 seconds

  // this is the saved item accumulator
  let tosave = []

  async function flush () {
    // log.verbose('-flush', tosave.length)
    const result = await saveAll(tosave)
    tosave = []
    return result
  }
  async function saver (item) {
    tosave.push(item)
    if (tosave.length >= batchSize) {
      return flush()
    }
    return true
  }

  // add the flush function to the returned function as an attribute
  saver.flush = flush
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
  // log.verbose('-needSaving', needSaving.length)

  if (needSaving.length === 0) {
    return true
  }

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
  if (!opts.filter || !opts.filter.__user) {
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
  return wrapped ? wrapped.item : null
}

async function digests (syncParams) {
  syncParams = syncParams || {}
  const nmParams = {
    since: syncParams.since || '1970-01-01T00:00:00Z',   // >= (inclusive)
    before: syncParams.before || '2040-01-01T00:00:00Z' // < (strict)
  }

  const items = await orm.Item.findAll({
    raw: true,
    attributes: ['digest', '__stamp'],
    where: {
      '__stamp': {
        $gte: nmParams.since,  // >= since (inclusive)
        $lt: nmParams.before // < before (strict)
      }
    },
    order: [['__stamp', 'DESC'], 'digest']
  }).map(r => r.digest)

  return items
}

async function digestOfDigests () {
  const d = await digests()
  return utils.digest(JSON.stringify(d), 'sha256', false)
}

// Delete by digest
// log.warn if item not found
// returns: The number of destroyed rows
async function remove (item) {
  const digest = _digest(item)
  const rowCount = await orm.Item.destroy({
    attributes: ['item'],
    where: {
      digest: digest
    }
  })
  if (rowCount !== 1) {
    log.warn('remove unexpected rowCount!=1', {rowCount: rowCount, digest: digest})
  }
  return rowCount
}

// TODO removeByBatch: modelled on saveAll/saveByBatch
async function removeAll (items) {
  const digests = items.map(_digest)
  const rowCount = await orm.Item.destroy({
    attributes: ['item'],
    where: {
      digest: digests
    }
  })
  if (rowCount !== items.length) {
    log.warn('removeAll unexpected rowCount!', {rowCount: rowCount, items: items.length})
  }
  return rowCount
}

// Deprecated, throws. Refactor out of sync...
// return item or null
// copied from confirmIdentical()
// not refactored because of detailed error loging in confirmIdentical()
// exposed for proactive recociliation in sync::saveWithExtraordinaryReconcile
async function getByKey (item) {
  // throw new Error('db::getByKey deprecated')
  const digest = _digest(item)
  const found = await orm.Item.findOne({
    attributes: ['item'],
    where: {
      digest: digest
    }
  })
  // console.log('found', found)
  // console.log('found.item', found.item)
  return (found) ? found.item : null
}
