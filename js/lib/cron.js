'use strict'

// dependencies - core-public-internal
const cron = require('cron')
const CronJob = cron.CronJob
const log = require('./log')
const tasks = require('./tasks')
const store = require('./store') // just for checkpoint

// globals
const allCredentials = [] // injected in start(injectedCredentials) below

// cron crash course:
//  */5 :== 0-59/5, and
//  4-59/10 :== 4,14,24,34
// Every recurrence pattern is offset by 10 seconds to avoid timestamping in previous minute!
const recurrence = {
  // everyDayAtMidnight: '10 0 0 * * *',
  // everyHourExceptMidnight: '10 0 1-23/1 * * *',
  // everyTenExceptOnTheHour: '10 10-59/10 * * * *',
  // everyHourOnTheHour: '10 0 * * * *',
  everyTenMinutes: '10 */10 * * * *',
  // everyTenMinutesOffsetByThree: '10 3-59/10 * * * *',
  everyTenMinutesOffsetByFour: '10 4-59/10 * * * *',
  everyTenMinutesOffsetByFive: '10 5-59/10 * * * *'
  // everyMinute: '10 * * * * *'
}

// serial execution of <task> for each credentialed user
// perform dedup task on all users, after main tasks are completed
// then perform a checkpoint
async function scrapeDedupDigest () {
  try {
    for (const credentials of allCredentials) {
      await tasks.scrape(credentials)
    }
    for (const credentials of allCredentials) {
      await tasks.dedup(credentials)
    }
    { // digest of items
      const {digest, elapsed} = await digestTimer(store.db.digestOfDigests)
      // checkpoint: Stash this as verbose for dev
      log.info('checkpoint', { digest, scope: 'item', elapsed })
    }
    { // digest of histories
      const {digest, elapsed} = await digestTimer(store.db.digestOfDigestsHistory)
      // checkpoint: Stash this as verbose for dev
      log.info('checkpoint', { digest, scope: 'history', elapsed })
    }
  } catch (error) {
    // TODO, might want to catch before tasks.dedup is called, to make sure dedup always runs...
    console.error('cron:error', error)
  }
  // local timer utility..
  async function digestTimer (digester) {
    const start = +new Date()
    const digest = await digester()
    const elapsed = (+new Date() - start) / 1000
    return {digest, elapsed}
  }
}

// auto-starts
function runJob (task, when) {
  const message = `Starting CronJob: ${task.name ? task.name : 'anonymous'} ${when}`
  log.info(message)

  var job = new CronJob({
    // timeZone: "America/Montreal" // npm install time, if you want to use TZ
    cronTime: when,
    onTick: task,
    start: true // default is true, else, if start:false, use job.start()
  })
  return job // if you ever want to stop it.
}

function start (injectedCredentials) {
  // set the module golbal variable
  allCredentials.length = 0 // (const so empty and push)
  allCredentials.push(...injectedCredentials)

  log.info('Starting Cron')
  // auto-start all three
  runJob(scrapeDedupDigest, recurrence.everyTenMinutes) // var scrape = ...
  runJob(tasks.logcheck, recurrence.everyTenMinutesOffsetByFour) // var logcheck =
  runJob(tasks.sync, recurrence.everyTenMinutesOffsetByFive) // var sync =
}
exports = module.exports = {
  start: start
}
