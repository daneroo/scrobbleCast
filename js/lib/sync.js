'use strict'

// dependencies - core-public-internal
var bluebird = require('bluebird')
var rp = require('request-promise')
var log = require('./log')
var store = require('./store')
const insertDedup = require('./tasks/insertDedup').insertDedup

exports = module.exports = {
  sync: sync
}

function sync (baseURI, syncParams) {
  // log.verbose(`Sync started from ${baseURI}`, syncParams)
  let remoteDigests
  let localDigests

  return loadFromURL(baseURI, syncParams)
    .then(function (items) {
      remoteDigests = items
      // log.verbose('|remoteDigests|', remoteDigests.size)
      return loadFromDB(syncParams)
    })
    .then(function (items) {
      localDigests = items
      // log.verbose('|localDigests|', localDigests.size)
      return compare(baseURI, remoteDigests, localDigests)
    })
    .catch(error => {
      log.error('Sync error', error)
    })
}

function compare (baseURI, remoteDigests, localDigests) {
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
  log.info('Sync missing', { from: baseURI, local: missingLocal.length, remote: missingRemote.length })
  return fetchMissingFromRemote(baseURI, missingLocal)
}

function fetchMissingFromRemote (baseURI, missingLocal) {
  return bluebird.each(missingLocal, (digest) => {
    const options = {
      uri: `${baseURI}/digest/${digest}`,
      gzip: true, // for compression
      json: true // Automatically parses the JSON string in the response
    }

    // log.verbose(`--fetching ${options.uri}`)
    return rp(options)
      // .then(store.db.save)
      .then(item => insertDedup([item]))
      .then(() => {
        log.verbose(`--persist:  ${options.uri}`)
      })
      .catch((/* err */) => {
        log.verbose(`--failed:   ${options.uri}`)
      })
  })
}

function loadFromURL (baseURI, syncParams) {
  const options = {
    uri: `${baseURI}/digests`,
    qs: syncParams,
    gzip: true, // for compression
    json: true // Automatically parses the JSON string in the response
  }

  return rp(options)
    .then(function (digests) {
      return new Set(digests)
    })
}
function loadFromDB (syncParams) {
  // log.debug('loadFromDB')
  return store.db.digests(syncParams)
    .then(function (digests) {
      return new Set(digests)
    })
}
