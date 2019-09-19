'use strict'

// This is meant to exercise the fetch API
// Can use it to test under request error conditions

// dependencies - core-public-internal
const os = require('os')
const PocketAPI = require('./lib/pocketAPIv2')
const utils = require('./lib/utils')
const spread = require('./lib/tasks/spread')
const log = require('./lib/log')

const allCredentials = require('./credentials.json')

main()

async function main () {
  const iterations = 1
  const intervalMS = 2000

  for (let i = 0; i < iterations; i++) {
    log.info('Scrape Smoke Test', {
      iteration: i,
      host: os.hostname()
    })
    await iteration()
    await delay(intervalMS)
    console.log('- Done iteration')
  }
}

async function iteration () {
  for (const credentials of allCredentials) {
    await tryemall(credentials)
  }
  log.info('Done all')
}

async function delay (ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function tryemall (credentials) {
  log.info('Start', credentials.name)

  // Use apiSession
  const apiSession = new PocketAPI({
    stamp: utils.stamp('10minutes')
  })

  await apiSession.login(credentials)

  const podcasts = await apiSession.podcasts()
  log.info('  01-podcasts', podcasts.length)

  const hoursAgo = 4 // which is the default
  const recentPodcastUuids = await spread.getRecentPodcastUuids(credentials.name, hoursAgo)
  log.info('   Recent podcasts for spread.select:', Object.keys(recentPodcastUuids).length)

  for (const podcast of podcasts) {
    const select = spread.select(apiSession.stamp, podcast.uuid, recentPodcastUuids) // new schedule method

    const { uuid, title } = podcast
    if (select >= 0) { // deep, shallow i.e. not skip, no longer any cocept of shallow
      const episodes = await apiSession.episodes(uuid)
      log.info('  02-episodes', episodes.length, { uuid, title, select: spread.selectName(select) })
    } else {
      // log.info('  02-episodes', 0, {uuid, title, select: spread.selectName(select)})
    }
  }

  const newReleases = await apiSession.newReleases()
  log.info('  03-new_releases', newReleases.length)

  const inProgress = await apiSession.inProgress()
  log.info('  04-in_progress', inProgress.length)

  log.info('Done', credentials.name)
}
