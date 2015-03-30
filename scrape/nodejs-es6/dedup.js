'use strict';

var dedup = require('./lib/dedup');
var utils = require('./lib/utils');

// globals
var allCredentials = require('./credentials.json');
utils.serialPromiseChainMap(allCredentials, dedup.dedupTask);
