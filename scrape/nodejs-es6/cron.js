"use strict";

var fs = require('fs');
var path = require('path');
var mkdirp = require('mkdirp');
var cron = require('cron');
var API = require('./lib/pocketAPI');
var Promise = require("bluebird");
var _ = require('lodash');
// dependencies

// globals
// external data for creds.
var credentials = require('./credentials.json');
var dataDirname = 'data';

// use substack's node-mkdirp, in case the dirname ever goes deeper.
mkdirp.sync(dataDirname);


function now() {
  // remove millis
  return new Date().toJSON().replace(/\.\d{3}Z$/, 'Z');
}

function logStamp(message) {
  console.log(new Date().toJSON(), message);
}

function dump(base, response) {
  var filename = path.join(dataDirname, base + '.' + now() + '.json');
  fs.writeFileSync(filename, JSON.stringify(response, null, 2));
}

function scrape() {
  logStamp('Start scraping (quick)');
  API.sign_in(credentials)
    .then(API.new_releases_episodes())
    .then(function(response) {
      logStamp('new_releases');
      dump('new_releases', response);
    })
    .then(API.in_progress_episodes())
    .then(function(response) {
      console.log(new Date().toJSON(), 'in_progress');
      dump('in_progress', response);
    });
}

var CronJob = cron.CronJob;
var job = new CronJob({
  cronTime: '0 */1 * * * *', // seconds included 6 params - standard 5 params supported
  onTick: scrape,
  start: true // default is true, else, if start:false, use job.start()
  // timeZone: "America/Montreal" // npm install time, if you want to use TZ
});

// make this process hang around
// closing stdin (^D/EOF) will exit.
process.stdin.resume();