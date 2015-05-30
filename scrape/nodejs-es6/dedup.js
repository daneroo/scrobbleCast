'use strict';

var tasks = require('./lib/tasks');

// globals
var allCredentials = require('./credentials.json');

Promise.each(allCredentials, tasks.dedup);
