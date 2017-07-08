'use strict'

// This is meant to exercise the fetch API
// Can use it to test under request error conditions

// dependencies - core-public-internal
var os = require('os')
var PocketAPI = require('./lib/pocketAPI')
var utils = require('./lib/utils')
var log = require('./lib/log')
// var tasks = require('./lib/tasks');

var allCredentials = require('./credentials.json')

main()

async function main () {
  const iterations = 2
  const intervalMS = 2000

  for (let i = 0; i < iterations; i++) {
    log.info('Scrape Smoke Test', {
      iteration: i,
      host: os.hostname()
    })
    await iteration()
    await delay(intervalMS)
    console.log('-')
  }
}

async function iteration () {
  for (let credentials of allCredentials) {
    await tryemall(credentials)
    // await tasks.quick(credentials);
    // await tasks.shallow(credentials);
    // await tasks.deep(credentials);
  }
  log.info('Done all')
}

async function delay (ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function tryemall (credentials) {
  log.info('Start', credentials.name)

  // Use apiSession
  var apiSession = new PocketAPI({
    stamp: utils.stamp('10minutes')
  })

  await apiSession.sign_in(credentials)

  // podcasts function factory - so invoke
  const podcasts = await apiSession.podcasts()()
  if (podcasts && podcasts.length > 0) {
    log.verbose('Observed stamp', {
      stamp: podcasts[0].__stamp
    })
  }
  log.info('  01-podcasts', podcasts.length)

  // podcastsPages function factory - so invoke
  const pages = await apiSession.podcastPages({
      // maxPage:3,
      // page: 1,
      // Spark from CBC Radio  05ccf3c0-1b97-012e-00b7-00163e1b201c
    uuid: '05ccf3c0-1b97-012e-00b7-00163e1b201c'
      // TNT
      // uuid: '77170eb0-0257-012e-f994-00163e1b201c'
      // Wachtel on the Arts from CBC Radio's Ideas
      // uuid:'89beea90-5edf-012e-25b7-00163e1b201c'
  })()
  log.info('  02-podcasts', pages.length)

  // new_releases function factory - so invoke
  const newReleases = await apiSession.new_releases()()
  log.info('  03-new_releases', newReleases.length)

  // in_progress function factory - so invoke
  const inProgress = await apiSession.in_progress()()
  log.info('  04-in_progress', inProgress.length)

  log.info('Done', credentials.name)
}
