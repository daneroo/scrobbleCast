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
const spread = require('./tasks/spread')

// Exported API
exports = module.exports = {
  logcheck,
  sync,
  dedup,
  scrape
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

  const start = +new Date()
  lifecycle('sync', 'start', 'admin')
  for (let host of hosts) {
    const startHost = +new Date()
    if (thisHost === host) {
      lifecycle(`sync:${host}`, 'skip', 'admin')
      continue
    }
    const baseURI = `http://${host}.imetrical.com:8000/api`
    lifecycle(`sync:${host}`, 'start', 'admin')
    await syncTask(baseURI, syncParams)
    const elapsedHost = Number(((+new Date() - startHost) / 1000).toFixed(1))
    lifecycle(`sync:${host}`, 'done', 'admin', elapsedHost)
  }
  const elapsed = Number(((+new Date() - start) / 1000).toFixed(1))
  lifecycle('sync', 'done', 'admin', elapsed)
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

// get podcasts then foreach: podcastPages->file
async function scrape (credentials) {
  lifecycle('scrape', 'start', credentials.name) // ? apiSession.stamp

  // this shoulbe isolated/shared in Session: return by sign_in.
  var apiSession = new PocketAPI({
    stamp: utils.stamp('10minutes')
  })

  try {
    await apiSession.sign_in(credentials)
    const podcasts = await apiSession.podcasts()()
    await saver(podcasts)
    progress('01-podcasts', podcasts)

    var podcastByUuid = _.groupBy(podcasts, 'uuid')

    for (let uuid of _.pluck(podcasts, 'uuid')) {
      // Scrape scheduling
      // -1,0,1: skip,deep,shallow
      // const select = spread.select(apiSession.stamp, spread.zeroOffsetUUID) // Old cron style
      const select = spread.select(apiSession.stamp, uuid) // new schedule method

      if (select >= 0) { // deep, shallow i.e. not skip
        const episodes = await apiSession.podcastPages({
          uuid: uuid,
          maxPage: select // 0:deep, 1:shallow
        })()
        await saver(episodes)
        progress('02-podcasts', episodes, {
          select: spread.selectName(select),
          title: podcastByUuid[uuid][0].title
        })
      }
    }
    const newReleases = await apiSession.new_releases()()
    await saver(newReleases)
    progress('03-new_releases', newReleases)

    const inProgress = await apiSession.in_progress()()
    await saver(inProgress)
    progress('04-in_progress', inProgress)
    lifecycle('scrape', 'done', apiSession.user)
  } catch (error) {
    log.error('tasks.scrape:error:', error)
    lifecycle('scrape', 'done with error', credentials.name)
  }
}

// -- Implementation functions

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
  log.verbose('|%s|', msg, {items: response.length, ...meta})
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
