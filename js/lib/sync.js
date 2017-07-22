'use strict'

// dependencies - core-public-internal
var bluebird = require('bluebird')
var _ = require('lodash') // for _.isEqual
var rp = require('request-promise')
var log = require('./log')
var store = require('./store')

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
      // log.verbose('-remote & !local', digest);
      missingLocal.push(digest)
    }
  })
  const missingRemote = []
  localDigests.forEach(function (acc, digest) {
    if (!remoteDigests.has(digest)) {
      // log.verbose('-local & !remote', digest);
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
      .then(saveWithExtraordinaryReconcile)
      .then(() => {
        log.verbose(`--persist:  ${options.uri}`)
      })
      .catch((/* err */) => {
        log.verbose(`--failed:   ${options.uri}`)
      })
  })
}

// Wraps store.db.save, with an attempt to resolve primary key violation with a custom rule:
// namely if all fields identical except played_up_to, then select the one with the largest value
function saveWithExtraordinaryReconcile (item) {
  return store.db.getByKey(item)
    .then(dbitem => {
      if (!dbitem) {
        return store.db.save(item)
      }
      var isIdentical = _.isEqual(item, dbitem)
      // if an identical item existed, we would not be in reconciliation
      log.verbose(`--obviously  identical:= ${isIdentical}`)

      let mismatchedKeys = []
      Object.keys(item).forEach(k => {
        if (item[k] !== dbitem[k]) {
          log.verbose(`  ${k}: ${item[k]} != ${dbitem[k]}`)
          mismatchedKeys.push(k)
        }
      })
      mismatchedKeys = mismatchedKeys.sort()

      // condition of extraordinary reconciliation
      // First Case: only difference is in the played_up_to field
      // - item.played_up_to > dbitem.played_up_to
      if (_.isEqual(['played_up_to'], mismatchedKeys)) {
        log.verbose('-sync:extraordinary:1')
        log.verbose(`--item    ${JSON.stringify(dbitem)}`)
        log.verbose(`--dbitem  ${JSON.stringify(dbitem)}`)
        if (item.played_up_to > dbitem.played_up_to) {
          log.info('sync:extraordinary:1 reconciliation', item)
          return store.db.remove(dbitem)
            .then(() => {
              return store.db.save(item)
            })
        } else {
          log.info('sync:extraordinary:1 reconciliation ignored, let the other side do it!', item)
        }
      }
      // Second case: only differences are played_up_to, and playing_status
      // - item.played_up_to > dbitem.played_up_to, and
      // - item.playing_status > dbitem.playing_status
      // } else if (_.isEqual(['played_up_to', 'playing_status'])) {
      if (_.isEqual(['played_up_to', 'playing_status'], mismatchedKeys)) {
        log.verbose('-sync:extraordinary:2')
        log.verbose(`--item    ${JSON.stringify(dbitem)}`)
        log.verbose(`--dbitem  ${JSON.stringify(dbitem)}`)
        if (item.played_up_to > dbitem.played_up_to &&
          item.playing_status > dbitem.playing_status) {
          log.info('sync:extraordinary:2 reconciliation', item)
          return store.db.remove(dbitem)
            .then(() => {
              return store.db.save(item)
            })
        } else {
          log.info('sync:extraordinary:2 reconciliation ignored, let the other side do it!', item)
        }
      }

      // default to the normal error processing
      return store.db.save(item)
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
