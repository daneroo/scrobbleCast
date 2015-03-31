'use strict';

var tasks = require('./lib/tasks');
var utils = require('./lib/utils');

// globals
var allCredentials = require('./credentials.json');
utils.serialPromiseChainMap(allCredentials, tasks.dedup);
