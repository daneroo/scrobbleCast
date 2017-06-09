'use strict'

var Promise = require('bluebird')
var tasks = require('./lib/tasks')

// globals
var allCredentials = require('./credentials.json')

Promise.each(allCredentials, tasks.dedup)
