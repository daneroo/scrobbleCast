'use strict'

// There are three scraping tasks:
// -quick (only 03-new-releases/04-in_progress)
// -shallow: implies quick
// -deep : implies shallow, and threfore quick

// dependencies - core-public-internal
var Promise = require('bluebird')
var _ = require('lodash')
// mine
var PocketAPI = require('./pocketAPI')
var log = require('./log')
var config = require('./config')
var utils = require('./utils')
var store = require('./store')
var dedupTask = require('./dedup').dedupTask
var logcheckTask = require('./logcheck').logcheckTask
var syncTask = require('./sync').sync

// Exported API
exports = module.exports = {
  logcheck: logcheck,
  sync: sync,
  dedup: dedup,
  quick: quick,
  shallow: shallow,
  deep: deep
}

function logcheck () {
  lifecycle('logcheck', 'start', 'admin')
  return logcheckTask()
    .then(function () {
      lifecycle('logcheck', 'done', 'admin')
    })
}

async function sync () {
  // poor man's discovery, default euler...
  const hosts = ['euler', 'dirac', 'darwin', 'newton']
  const thisHost = config.hostname.split('.')[0]
  const syncParams = {
    since: utils.ago(24 * 3600),
    before: utils.stamp('10minutes')
  }

  lifecycle('sync', 'start', 'admin')
  for (let host of hosts) {
    if (thisHost === host) {
      lifecycle(`sync:${host}`, 'skip', 'admin')
      continue
    }
    const baseURI = `http://${host}.imetrical.com:8000/api`
    lifecycle(`sync:${host}`, 'start', 'admin')
    await syncTask(baseURI, syncParams)
    lifecycle(`sync:${host}`, 'done', 'admin')
  }
  lifecycle('sync', 'done', 'admin')
}

function dedup (credentials) {
  var start = +new Date()
  lifecycle('dedup', 'start', credentials.name)
  return dedupTask(credentials)
    .then(function () {
      var elapsed = Number(((+new Date() - start) / 1000).toFixed(1))
      lifecycle('dedup', 'done', credentials.name, elapsed)
    })
}

function quick (credentials) {
  lifecycle('quick', 'start', credentials.name)
  var apiSession = new PocketAPI({
    stamp: utils.stamp('10minutes')
  })
  return apiSession.sign_in(credentials)
    .then(quickWithSession(apiSession))
    .then(function () {
      lifecycle('quick', 'done', credentials.name)
    })
    .catch(function (error) {
      console.log('tasks.quick:error:', error)
      lifecycle('quick', 'done with error', credentials.name)
      return false
      // throw error;
    })
}

function shallow (credentials) {
  var isDeep = false
  return scrape(credentials, isDeep)
}

function deep (credentials) {
  var isDeep = true
  return scrape(credentials, isDeep)
}

// -- Implementation functions
function quickWithSession (apiSession) {
  return function () {
    // lifecycle('.quick', 'start', apiSession.user);
    return Promise.resolve(42)
      .then(apiSession.new_releases())
      .then(function (response) {
        progress('03-new_releases', response)
        saver(response)
      })
      .then(apiSession.in_progress())
      .then(function (response) {
        progress('04-in_progress', response)
        saver(response)
      })
      // .then(function() {
      //   lifecycle('.quick', 'done', apiSession.user);
      // })
      .catch(function (error) {
        console.log('tasks.quick:error', error)
        lifecycle('.quick', 'done: with error', apiSession.user)
        return false
        // throw error;
      })
  }
}

// get podcasts then foreach: podcastPages->file
function scrape (credentials, isDeep) {
  // this shoulbe isolated/shared in Session: return by sign_in.
  var apiSession = new PocketAPI({
    stamp: utils.stamp('10minutes')
  })
  var mode = isDeep ? 'deep' : 'shallow'
  lifecycle(mode, 'start', credentials.name) // ? apiSession.stamp

  return apiSession.sign_in(credentials)
    .then(apiSession.podcasts())
    .then(function (response) {
      saver(response)
      progress('01-podcasts', response)
      return response
    })
    .then(function (podcasts) {
      // just for lookupFun
      var podcastByUuid = _.groupBy(podcasts, 'uuid')

      return Promise.map(_.pluck(podcasts, 'uuid'), function (uuid) {
        return Promise.resolve(42)
          .then(apiSession.podcastPages({
            uuid: uuid,
            maxPage: isDeep ? 0 : 1
          }))
          .then(function (response) {
            saver(response)
            progress('02-podcasts', response, {
              title: podcastByUuid[uuid][0].title
            })
            return response
          })
      }, {
        concurrency: 1
      })
    })
    .then(function () {
      lifecycle(mode, 'done', apiSession.user)
    })
    // Now call quick
    .then(quickWithSession(apiSession))
    .catch(function (error) {
      console.log('tasks.' + mode + ':error:', error)
      lifecycle(mode, 'done with error', credentials.name)
      return false
      // throw error;
    })
}

// --- Utility functions
// Task quick: start for daniel
function lifecycle (task, verb, user, elapsed) {
  var meta = {
    task: task,
    user: user
  }
  if (elapsed) {
    meta.elapsed = elapsed
  }
  log.info('Task %s', verb, meta)
}

function progress (msg, response, meta) {
  meta = meta || {}
  log.verbose('|%s|: %d', msg, response.length, meta)
}

// Called only once, replaces self with noop.
var initDB = function () {
  initDB = function () {
    // log.verbose('Dummy initialize');
    return Promise.resolve(true)
  }
  // log.verbose('Actually initialize');
  return store.db.init()
}

// this is where I can switch from file to postgress persistence
function saver (items) {
  return initDB()
    .then(function () {
      return store.db.saveAll(items)
    })
}
