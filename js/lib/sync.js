'use strict'

// dependencies - core-public-internal
const rp = require('request-promise')
const log = require('./log')
const nats = require('./nats')
const store = require('./store')
const insertDedup = require('./tasks/insertDedup').insertDedup

exports = module.exports = {
  sync
}

async function sync(baseURI, syncParams) {
  const remoteDigests = await loadFromURL(baseURI, syncParams)
  const localDigests = await loadFromDB(syncParams)
  const counts = compare(baseURI, remoteDigests, localDigests)
  return counts
}

async function compare(baseURI, remoteDigests, localDigests) {
  const missingInLocal = []
  remoteDigests.forEach(function (acc, digest) {
    if (!localDigests.has(digest)) {
      // log.verbose('-remote & !local', digest)
      missingInLocal.push(digest)
    }
  })
  const missingInRemote = []
  localDigests.forEach(function (acc, digest) {
    if (!remoteDigests.has(digest)) {
      // log.verbose('-local & !remote', digest)
      missingInRemote.push(digest)
    }
  })
  nats.publish('sync.count', {
    remote: baseURI,
    missingInLocal: missingInLocal.length,
    missingInRemote: missingInRemote.length
  })
  log.verbose('Sync missing', {
    remote: baseURI,
    missingInLocal: missingInLocal.length,
    missingInRemote: missingInRemote.length
  })
  const counts = await fetchMissingFromRemote(baseURI, missingInLocal)
  return counts
}

async function fetchMissingFromRemote(baseURI, missingLocal) {
  const fetchedItems = []
  for (const digest of missingLocal) {
    const options = {
      uri: `${baseURI}/digest/${digest}`,
      gzip: true, // for compression
      json: true // Automatically parses the JSON string in the response
    }
    try {
      const item = await rp(options)
      fetchedItems.push(item)
      const { __stamp: stamp, title } = item
      nats.publish('sync.trace', { uri: options.uri, stamp, title })
      log.verbose(`--fetched:  ${options.uri}`, { stamp, title })
    } catch (error) {
      nats.publish('sync.error', { uri: options.uri, error: error.message })
      log.verbose(`--failed to fetch: ${options.uri} ${error.message}`)
    }
  }
  const counts = await insertDedup(fetchedItems)
  return counts
}

async function loadFromURL(baseURI, syncParams) {
  const options = {
    uri: `${baseURI}/digests`,
    qs: syncParams,
    gzip: true, // for compression
    json: true // Automatically parses the JSON string in the response
  }
  const digests = await rp(options)
  return new Set(digests)
}

async function loadFromDB(syncParams) {
  // log.debug('loadFromDB')
  const digests = await store.db.digests(syncParams)
  return new Set(digests)
}
