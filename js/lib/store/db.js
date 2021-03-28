// This is the sequelize implentation of the store API
'use strict'

// pg implementation (save only)

// dependencies - core-public-internal
var crypto = require('crypto')
var log = require('../log')
var utils = require('../utils')
const orm = require('../model/orm')
const Op = orm.Op
// these might be moved or exposed

// var sinkFile = require('../sink/file');

// Use default from utils?
const DIGEST_ALGORITHM = 'sha256'

// Exported API
exports = module.exports = {
  init, // setup the database pool, ddl...
  end,

  // save: (item) => {}, // should return (Promise)(status in insert,duplicate,error)
  save,

  // saveByBatch(batchSize) // accumulates writes, must be flushed at end
  saveByBatch,
  saveAll,

  // load: (opts, handler) => {} // foreach item, cb(item);
  fieldOrders: {
    dedup: 'dedup', // default
    snapshot: 'snapshot'
  },
  loadQy,
  load,
  loadByRangeWithDeadline,
  loadItemsForHistory,
  getByDigest,

  digestsQy,
  digests,
  digestOfDigests,
  digestOfDigestsHistory,

  history,

  remove,
  removeAll,

  // Deprecated: for sync reconciliation
  getByKey

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
      log.error('_isErrorDuplicateDigest', { message: error.message, name: error.name, errors: error.errors })
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
        [Op.in]: digests
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

  const wrapped = items.map(i => ({ item: i, digest: _digest(i) }))

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
      log.error('saveAll:error', { message: error.message, name: error.name, errors: error.errors })
      throw error
    }
    // log.debug('saveAll: At least one duplicate digest, save each item')
  }

  // If we get here it's because we had a duplicate digest, so save each item
  for (const item of items) {
    await save(item)
  }
  return true
}

// order must be one of dedup, or snapshot
function loadQy ({ user, order = 'dedup' }) {
  if (!user) {
    throw (new Error('db:loadQy missing required user'))
  }
  const fieldOrders = {
    dedup: ['__user', '__type', 'uuid', '__stamp', '__sourceType', 'digest'], // dedup order
    snapshot: ['__user', '__stamp', '__type', 'uuid', '__sourceType', 'digest'] // snapshot,file order
  }
  if (!order || !exports.fieldOrders[order] || !fieldOrders[order]) {
    throw (new Error('db:loadQy unknown field order error: ' + order))
  }

  return {
    attributes: ['item'],
    where: {
      __user: user
    },
    order: fieldOrders[order]
    // order: ['__user', '__type', 'uuid', '__stamp', '__sourceType', 'digest'] // dedup load order

  }
}

// pass each item in the database to the itemHandler
// there are 2 load orders:
//   dedup: suitable for smaller accumulator (grouped by uuid)
//   snapshot: suitable for snapshot file order
// -No longer returns anything, accumulate your values in the itemHandler
// -itemHandler should be an async/promise function (it's resolved return value is ignored)
async function load ({ user, order = 'dedup', pageSize = 10000, where = {} }, itemHandler) {
  const noop = async () => true // default handler (async)
  itemHandler = itemHandler || noop
  // opts.prefix = opts.prefix || ''
  if (!user) {
    throw (new Error('db:load missing required user property'))
  }
  if (!order || !exports.fieldOrders[order]) {
    throw (new Error('db:load unknown field order error: ' + order))
  }

  const qy = loadQy({ user, order })
  if (Object.keys(where).length > 0) {
    qy.where = { ...qy.where, ...where }
    // console.log('Qualified load:', {qy})
  }
  await orm.Item.findAllByPage(qy, itemHandler, pageSize)
}

// Same as load but breaks the queries by Type/UUID ranges
// also has a deadline/timeout
async function loadByRangeWithDeadline ({ user, order = 'dedup', pageSize = 10000, where = {}, timeout = 30000 }, itemHandler) {
  const start = +new Date()
  const { between } = Op
  const offset = stampOffset(new Date().toISOString()) // [0,144)
  const uuidRanges = [
    ['0', '1'], ['1', '2'], ['2', '3'], ['3', '4'], ['4', '5'], ['5', '6'], ['6', '7'], ['7', '8'],
    ['8', '9'], ['9', 'a'], ['a', 'b'], ['b', 'c'], ['c', 'd'], ['d', 'e'], ['e', 'f'], ['f', 'g']
  ]
  for (const type of ['episode', 'podcast']) {
    for (let idx = 0; idx < uuidRanges.length; idx++) {
      const uuidRange = uuidRanges[(idx + offset) % uuidRanges.length]
      const where = { __type: type, uuid: { [between]: uuidRange } }
      await load({ user: 'daniel', order, pageSize, where }, itemHandler)

      const elapsed = +new Date() - start
      log.debug('loadByRange', { type, uuidPfx: uuidRange[0], timeout, elapsed })

      if (elapsed > timeout) {
        log.warn('loadByRange timed out', { timeout, elapsed })
        // break out of both loops
        return
      }
    }
  }
}

// TODO:daneroo Copied from tasks/spread because ofg circular dependancy
// returns the offset for the ISO8601 stamp
// The offset represents an offset from midnight in (ten minute) units
// returns [0,144)
function stampOffset (stamp) {
  const startOfDay = stamp.substr(0, 10) + 'T00:00:00Z'

  const diff = +new Date(stamp) - new Date(startOfDay)
  // number of (full) ten minute periods since 00:00
  const offset = Math.floor(diff / 1000 / 60 / 10)
  return offset
}

// fetch all items with same __user,__type,uuid
async function loadItemsForHistory (item) {
  const items = []
  await load({
    user: item.__user,
    where: { __type: item.__type, uuid: item.uuid }
  }, async function (fetched) {
    items.push(fetched.item)
  })
  return items
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

function digestsQy ({ since = '1970-01-01T00:00:00Z', before = '2040-01-01T00:00:00Z' } = {}) {
  return {
    raw: true,
    attributes: ['digest', '__stamp'],
    where: {
      __stamp: {
        [Op.gte]: since, // >= since (inclusive)
        [Op.lt]: before // < before (strict)
      }
    },
    order: [['__stamp', 'DESC'], 'digest'] // __stamp DESC is causing extra time, even with index
  }
}

async function digests (syncParams = {}) {
  const qy = digestsQy(syncParams)
  const items = await orm.Item.findAll(qy).map(r => r.digest)
  return items
}

// Refactored to work with Item and History
// itemDigester takes the "item" return from query (qy) and produces the digest string
async function digester (Model, qy, itemDigester, pageSize = 100000) { // for Item and History
  const algorithm = 'sha256'

  const hash = crypto.createHash(algorithm)
  let isFirst = true
  async function handler (item) {
    const digest = itemDigester(item)
    const str = ((isFirst) ? '[' : ',') + JSON.stringify(digest)
    hash.update(str)
    isFirst = false
  }
  await Model.findAllByPage(qy, handler, pageSize)
  hash.update(']')
  return hash.digest('hex')
}

async function digestOfDigests () {
  const pageSize = 100000 // tradeoff speed/memory
  const qy = digestsQy()
  const itemDigester = item => item.digest
  return digester(orm.Item, qy, itemDigester, pageSize)
}

async function digestOfDigestsHistory () {
  const pageSize = 10000 // tradeoff speed/memory
  const qy = {
    raw: true,
    attributes: ['digest'],
    order: ['__user', '__type', 'uuid']
  }
  const itemDigester = item => item.digest
  return digester(orm.History, qy, itemDigester, pageSize)
}

function historyQy ({ user, type, uuid, since = '1970-01-01T00:00:00Z', before = '2040-01-01T00:00:00Z' } = {}) {
  const qy = {
    attributes: ['history', '__lastUpdated'],
    where: {
      __lastUpdated: {
        [Op.gte]: since, // >= since (inclusive)
        [Op.lt]: before // < before (strict)
      }
    },
    order: [['__lastUpdated', 'DESC'], '__user', '__type', 'uuid']
  }
  if (user) {
    qy.where.__user = user
  }
  if (type) {
    qy.where.__type = type
  }
  if (uuid) {
    qy.where.uuid = uuid
  }
  return qy
}

async function history (params) {
  const qy = historyQy(params)
  const histories = await orm.History.findAll(qy).map(r => r.history)
  return histories
}
// Delete by digest
// log.warn if item not found
// returns: The number of destroyed rows
async function remove (item) {
  const digest = _digest(item)
  const rowCount = await orm.Item.destroy({
    attributes: ['item'], // TODO, don't think this is used!!
    where: {
      digest: digest
    }
  })
  if (rowCount !== 1) {
    log.warn('remove unexpected rowCount!=1', { rowCount: rowCount, digest: digest })
  }
  return rowCount
}

// TODO removeByBatch: modelled on saveAll/saveByBatch
async function removeAll (items) {
  const digests = items.map(_digest)
  const rowCount = await orm.Item.destroy({
    attributes: ['item'], // TODO, don't think this is used!!
    where: {
      digest: digests
    }
  })
  if (rowCount !== items.length) {
    log.warn('removeAll unexpected rowCount!=items', { rowCount: rowCount, items: items.length })
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
