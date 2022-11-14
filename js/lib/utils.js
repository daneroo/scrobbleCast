'use strict'

// dependencies - core-public-internal
const crypto = require('crypto')
const _ = require('lodash')
const log = require('./log')

// expect to be called with '10minutes','minute','second' or no param (millis)
// return an iso-8601 string
function stamp (grain, nowStamp) {
  const now = nowStamp ? new Date(nowStamp) : new Date()
  if (grain === 'minute') {
    now.setSeconds(0)
  }
  if (grain === '10minutes') {
    now.setSeconds(0)
    now.setMinutes(Math.floor(now.getMinutes() / 10) * 10)
  }
  if (!grain) {
    // iso8601, keep millis
    return now.toJSON()
  }
  // iso8601, remove millis
  return now.toJSON().replace(/\.\d{3}Z$/, 'Z')
}

function ago (seconds) {
  const when = new Date(+new Date() - seconds * 1000)
  return when.toJSON().replace(/\.\d{3}Z$/, 'Z')
}

// TODO: pubsub would be good
function logStamp (message) {
  // console.log('deprecated: use log.info(\'info\',...)');
  log.info(message)
}

// parse a stamp from a file/path
function stampFromFile (file) {
  let stamp = file.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z/)
  if (stamp && stamp.length) {
    stamp = new Date(stamp[0])
    stamp.setSeconds(0)
    stamp = stamp.toJSON().replace(/\.\d{3}Z$/, 'Z')
  }
  return stamp
}

function isEqualWithoutPrototypes (a, b) {
  if (_.isEqual(a, b)) {
    return true
  }
  // removes prototype stuff
  a = JSON.parse(JSON.stringify(a))
  b = JSON.parse(JSON.stringify(b))
  return _.isEqual(a, b)
}

// tentative set comparison, for relaxed overwrite rule
function hasSameContent (a, b) {
  // must be an array
  log.verbose('hasSameContent:array check:', { a: Array.isArray(a), b: Array.isArray(b) })
  if (!Array.isArray(a) || !Array.isArray(b)) {
    return false
  }
  log.verbose('hasSameContent:array counts check:', { a: a.length, b: b.length })
  if (a.length !== b.length) {
    return false
  }

  const strfy = (item) => JSON.stringify(item)
  const A = new Set(a.map(strfy))
  const B = new Set(b.map(strfy))

  let sameContent = true
  for (const aa of A) {
    if (!B.has(aa)) {
      sameContent = false
      log.verbose('aa is not in B', aa)
    }
  }
  for (const bb of B) {
    if (!A.has(bb)) {
      sameContent = false
      log.verbose('bb is not in A', bb)
    }
  }
  return sameContent
  // function k(it) {
  //   // return [it.__user, it.__stamp, it.__type, it.uuid, it.__sourceType].join('');
  //   return [it.uuid, it.__sourceType].join('/');
  // }
  // for (let i = 0; i < Math.min(a.length, b.length); i++) {
  //   const aa = a[i], bb = b[i];
  //   if (strfy(aa) !== strfy(bb)) {
  //     console.log('i,aa,bb', i, k(aa) + ' ' + k(bb));
  //   }
  // }
}

function md5 (str) {
  const hash = crypto.createHash('md5').update(str).digest('hex')
  return hash
}

// TODO(daneroo): option object for {algorithm:, prependAlgorithm:bool}
function digest (str, algorithm, prependAlgorithm) {
  algorithm = algorithm || 'sha256'
  let hash = crypto.createHash(algorithm).update(str).digest('hex')
  if (prependAlgorithm) {
    hash = algorithm + ':' + hash
  }
  return hash
}

async function memoryUsageInMB () {
  const mu = process.memoryUsage()
  const inMB = {
    mem: {
      rss: (mu.rss / 1024 / 1024).toFixed(2),
      heapTotal: (mu.heapTotal / 1024 / 1024).toFixed(2),
      heapUsed: (mu.heapUsed / 1024 / 1024).toFixed(2)
    }
  }
  return inMB
}

// Pass --expose-gc when launching node to enable forced garbage collection.
async function collectGC () {
  if (global.gc) {
    global.gc()
    global.gc()
    global.gc()
    global.gc()
  } else {
    // log.debug('Garbage collection unavailable.  Pass --expose-gc when launching node to enable forced garbage collection.')
  }
}

async function logMemAfterGC () {
  async function showMem (pfx) {
    const msg = `${pfx}Mem after GC (MB)`
    log.verbose(msg, await memoryUsageInMB())
  }
  showMem('-')
  if (global.gc) {
    await collectGC()
    showMem('+')
  }
}

exports = module.exports = {
  stamp,
  ago,
  logStamp,
  stampFromFile,
  isEqualWithoutPrototypes,
  hasSameContent,
  digest,
  md5,
  logMemAfterGC,
  collectGC,
  memoryUsageInMB
}
