'use strict'

// dependencies - core-public-internal
var rp = require('request-promise')
var log = require('./log')
var store = require('./store')
const insertDedup = require('./tasks/insertDedup').insertDedup

exports = module.exports = {
  sync: sync
}

async function sync (baseURI, syncParams) {
  const remoteDigests = await loadFromURL(baseURI, syncParams)
  const localDigests = await loadFromDB(syncParams)
  const counts = compare(baseURI, remoteDigests, localDigests)
  return counts
}

async function compare (baseURI, remoteDigests, localDigests) {
  const missingLocal = []
  remoteDigests.forEach(function (acc, digest) {
    if (!localDigests.has(digest)) {
      // log.verbose('-remote & !local', digest)
      missingLocal.push(digest)
    }
  })
  const missingRemote = []
  localDigests.forEach(function (acc, digest) {
    if (!remoteDigests.has(digest)) {
      // log.verbose('-local & !remote', digest)
      missingRemote.push(digest)
    }
  })
  log.verbose('Sync missing', { from: baseURI, local: missingLocal.length, remote: missingRemote.length })
  const counts = await fetchMissingFromRemote(baseURI, missingLocal)
  return counts
}

async function fetchMissingFromRemote (baseURI, missingLocal) {
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
      log.verbose(`--fetched:  ${options.uri}`)
    } catch (error) {
      log.verbose(`--failed to fetch: ${options.uri}`)
    }
  }
  const counts = await insertDedup(fetchedItems) // wrap as array..
  return counts
}

async function loadFromURL (baseURI, syncParams) {
  const options = {
    uri: `${baseURI}/digests`,
    qs: syncParams,
    gzip: true, // for compression
    json: true // Automatically parses the JSON string in the response
  }
  const digests = await rp(options)
  return new Set(digests)
}

async function loadFromDB (syncParams) {
  // log.debug('loadFromDB')
  const digests = await store.db.digests(syncParams)
  return new Set(digests)
}
