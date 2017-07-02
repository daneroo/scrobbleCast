'use strict'

var Promise = require('bluebird')
var tasks = require('./lib/tasks')
var store = require('./lib/store')
var log = require('./lib/log')

// globals
var allCredentials = require('./credentials.json')

Promise.each(allCredentials, tasks.dedup)
  .then(async () => { // this does not belong here, change structure of cron/tasks
    const dod = await store.db.digestOfDigests()
    log.info('checkpoint', { digest: dod })
  })
