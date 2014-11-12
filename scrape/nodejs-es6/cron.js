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

// remove millis, round seconds, convert to iso8601 string
function nowMinute() {
  // remove millis
  var stamp = new Date();
  stamp.setSeconds(0);
  return stamp.toJSON().replace(/\.\d{3}Z$/, 'Z'); // iso8601, remove millis
}

function logStamp(message) {
  console.log(new Date().toJSON(), message);
}

function writeResponse(base, response) {
  logStamp(base);
  var stamp = nowMinute();
  var content = JSON.stringify(response, null, 2);
  // old way
  var filename = path.join(dataDirname, base + '.' + stamp + '.json');
  fs.writeFileSync(filename, content);
  console.log('-', filename);

  // new way
  var dir = path.join(dataDirname, 'byDate', stamp);
  mkdirp.sync(dir);
  var newfile = path.join(dir, [base,'json'].join('.'));
  console.log('+', newfile);
  fs.writeFileSync(newfile, content);
}

function scrape() {
  logStamp('Start scraping (quick)');
  API.sign_in(credentials)
    .then(API.new_releases_episodes())
    .then(function(response) {
      writeResponse('03-new_releases', response);
    })
    .then(API.in_progress_episodes())
    .then(function(response) {
      writeResponse('04-in_progress', response);
    });
}

var CronJob = cron.CronJob;
var job = new CronJob({
  cronTime: '0 */10 * * * *', // seconds included 6 params - standard 5 params supported
  onTick: scrape,
  start: true // default is true, else, if start:false, use job.start()
  // timeZone: "America/Montreal" // npm install time, if you want to use TZ
});

// make this process hang around
// closing stdin (^D/EOF) will exit.
process.stdin.resume();