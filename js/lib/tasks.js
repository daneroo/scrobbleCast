'use strict'

// There are three scraping tasks:
// -quick (only 03-new-releases/04-in_progress)
// -shallow: implies quick
// -deep : implies shallow, and threfore quick

// dependencies - core-public-internal
const _ = require('lodash')
// mine
const PocketAPI = require('./pocketAPI')
const log = require('./log')
const config = require('./config')
const utils = require('./utils')
const dedupTask = require('./dedup').dedupTask
const logcheckTask = require('./logcheck').logcheckTask
const syncTask = require('./sync').sync
const spread = require('./tasks/spread')
const insertDedup = require('./tasks/insertDedup').insertDedup

// Exported API
exports = module.exports = {
  logcheck,
  sync,
  dedup,
  scrape
}

function logcheck () {
  const start = +new Date()
  lifecycle('logcheck', 'start')
  return logcheckTask()
    .then(function () {
      lifecycle('logcheck', 'done', {elapsed: elapsedSince(start)})
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
  lifecycle('sync', 'start')
  for (let host of hosts) {
    const startHost = +new Date()
    if (thisHost === host) {
      lifecycle(`sync:${host}`, 'skip')
      continue
    }
    const baseURI = `http://${host}.imetrical.com:8000/api`
    lifecycle(`sync:${host}`, 'start')
    await syncTask(baseURI, syncParams)
    lifecycle(`sync:${host}`, 'done', { elapsed: elapsedSince(startHost) })
  }
  lifecycle('sync', 'done', {elapsed: elapsedSince(start)})
}

function dedup (credentials) {
  var start = +new Date()
  lifecycle('dedup', 'start', { user: credentials.name })
  return dedupTask(credentials)
    .then(function () {
      lifecycle('dedup', 'done', { user: credentials.name, elapsed: elapsedSince(start) })
    })
}

// get podcasts then foreach: podcastPages->file
async function scrape (credentials) {
  var start = +new Date()
  lifecycle('scrape', 'start', {user: credentials.name})

  // this shoulbe isolated/shared in Session: return by sign_in.
  var apiSession = new PocketAPI({
    stamp: utils.stamp('10minutes')
  })

  try {
    const sums = {} // e.g. {items:3,inserted:1,deleted:2}
    await apiSession.sign_in(credentials)
    const podcasts = await apiSession.podcasts()()
    const counts01 = await insertDedup(podcasts)
    sumCounts(sums, counts01)
    progress('01-podcasts', counts01)

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
        const counts02 = await insertDedup(episodes)
        sumCounts(sums, counts02)
        progress('02-podcasts', {
          ...counts02,
          select: spread.selectName(select),
          title: podcastByUuid[uuid][0].title
        })
      }
    }
    const newReleases = await apiSession.new_releases()()
    const counts03 = await insertDedup(newReleases)
    sumCounts(sums, counts03)
    progress('03-new_releases', counts03)

    const inProgress = await apiSession.in_progress()()
    const counts04 = await insertDedup(inProgress)
    sumCounts(sums, counts04)
    progress('04-in_progress', counts04)

    lifecycle('scrape', 'done', {user: apiSession.user, ...sums, elapsed: elapsedSince(start)})
  } catch (error) {
    log.error('tasks.scrape:error:', error)
    lifecycle('scrape', 'done with error', {user: credentials.name})
  }
}

// -- Implementation functions

// --- Utility functions

// format as %.1f seconds
function elapsedSince (since) {
  return Number(((+new Date() - since) / 1000).toFixed(1))
}

function sumCounts (sums, counts) {
  for (const key in counts) {
    sums[key] = sums[key] || 0
    sums[key] += counts[key]
  }
  return sums
}
// Task quick: start for daniel
function lifecycle (task, verb, meta) {
  meta = {
    task,
    ...meta
  }
  log.info(`Task ${verb}`, meta)
}

function progress (msg, meta) {
  meta = meta || {}
  log.info(`|${msg}|`, meta)
}
