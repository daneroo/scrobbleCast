'use strict'

// dependencies - core-public-internal
const _ = require('lodash')
// mine
const PocketAPI = require('./pocketAPIv2')
const log = require('./log')
const config = require('./config')
const nats = require('./nats')
const utils = require('./utils')
const { dedupTask } = require('./dedup')
const { dedupStampTask } = require('./dedupStamp')
const { logcheckTask } = require('./logcheck')
const { sync: syncTask } = require('./sync')
const spread = require('./tasks/spread')
const { insertDedup } = require('./tasks/insertDedup')

// Exported API
exports = module.exports = {
  logcheck,
  sync,
  dedupStamp,
  dedup,
  scrape
}

function logcheck () {
  const start = +new Date()
  lifecycle('logcheck', 'start')
  return logcheckTask()
    .then(function () {
      lifecycle('logcheck', 'done', { elapsed: elapsedSince(start) })
    })
}

async function sync () {
  // poor man's discovery, default dirac...
  const hosts = ['dirac', 'darwin', 'newton']
  const thisHost = config.hostname.split('.')[0]
  const syncParams = {
    since: utils.ago(24 * 3600),
    before: utils.stamp('10minutes')
  }

  const start = +new Date()
  lifecycle('sync', 'start')
  for (const remote of hosts) {
    if (thisHost === remote) {
      // lifecycle('sync:host', 'skip', { remote })
      continue
    }
    try {
      const startRemote = +new Date()
      const baseURI = `http://${remote}.imetrical.com:8000/api`
      lifecycle('sync:host', 'start', { remote })
      const counts = await syncTask(baseURI, syncParams)
      lifecycle('sync:host', 'done', { remote, ...counts, elapsed: elapsedSince(startRemote) })
    } catch (error) {
      log.error('tasks.sync:host:error:', error)
      lifecycle('sync:host', 'done with error', { remote })
    }
  }
  lifecycle('sync', 'done', { elapsed: elapsedSince(start) })
}

async function dedupStamp (credentials) {
  const start = +new Date()
  lifecycle('dedupStamp', 'start', { user: credentials.name })
  const counts = await dedupStampTask(credentials)
  lifecycle('dedupStamp', 'done', { user: credentials.name, ...counts, elapsed: elapsedSince(start) })
}

async function dedup (credentials) {
  const start = +new Date()
  lifecycle('dedup', 'start', { user: credentials.name })
  const counts = await dedupTask(credentials)
  lifecycle('dedup', 'done', { user: credentials.name, ...counts, elapsed: elapsedSince(start) })
}

// get podcasts then foreach: podcastPages->file
async function scrape (credentials) {
  const start = +new Date()
  lifecycle('scrape', 'start', { user: credentials.name })

  // this should be isolated/shared in Session: return by sign_in.
  const apiSession = new PocketAPI({
    stamp: utils.stamp('10minutes')
  })

  try {
    const sums = {} // e.g. {items:3,inserted:1,deleted:2}
    await apiSession.login(credentials)
    const podcasts = await apiSession.podcasts()
    const counts01 = await insertDedup(podcasts)
    sumCounts(sums, counts01)

    // get recently played podcasts, to scrape them even if not scheduled
    const hoursAgo = 4 // which is the default
    const recentPodcastUuids = await spread.getRecentPodcastUuids(credentials.name, hoursAgo)
    // just to log in progress(01-)
    counts01.selectRecent = Object.keys(recentPodcastUuids).length

    progress('01-podcasts', counts01)

    const podcastByUuid = _.groupBy(podcasts, 'uuid')

    for (const uuid of _.pluck(podcasts, 'uuid')) {
      // Scrape scheduling: shallow is no longer distinct from deep
      // -1,0,1,2: skip,deep,shallow,recent
      const select = spread.select(apiSession.stamp, uuid, recentPodcastUuids) // new schedule method

      if (select >= 0) { // deep, shallow i.e. not skip, no longer any concept of shallow
        const episodes = await apiSession.episodes(uuid)
        const counts02 = await insertDedup(episodes)
        sumCounts(sums, counts02)
        progress('02-podcasts', {
          ...counts02,
          select: spread.selectName(select),
          title: podcastByUuid[uuid][0].title
        })
      }
    }
    const newReleases = await apiSession.newReleases()
    const counts03 = await insertDedup(newReleases)
    sumCounts(sums, counts03)
    progress('03-new_releases', counts03)

    const inProgress = await apiSession.inProgress()
    const counts04 = await insertDedup(inProgress)
    sumCounts(sums, counts04)
    progress('04-in_progress', counts04)

    lifecycle('scrape', 'done', { user: apiSession.user, ...sums, elapsed: elapsedSince(start) })
  } catch (error) {
    log.error('tasks.scrape:error:', error)
    lifecycle('scrape', 'done with error', { user: credentials.name })
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
function lifecycle (task, state, meta) {
  meta = {
    task,
    ...meta
  }
  log.info(`Task ${state}`, meta)
  nats.publish('task', { state, ...meta })
}

function progress (step, meta) {
  meta = meta || {}
  log.info(`|${step}|`, meta)
  nats.publish('progress', { step, ...meta })
}
