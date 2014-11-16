"use strict";

var fs = require('fs');
var path = require('path');
var mkdirp = require('mkdirp');
var cron = require('cron');
var tasks = require('./lib/tasks');

var CronJob = cron.CronJob;

// TODO: this should become cronRunner, move to lib, receive/inject config
// e.g. fomr index.js:
//   require('./lib/cronRunner').run(config)

// cron crash course:
//  */5 :== 0-59/5, and
//  1-59/5 :== 1,6,11,16,21
//  4-59/10 :== 4,14,24,34
// example
// every 10 minutes
//   cronTime: '0 */10 * * * *', // seconds included 6 params - standard 5 params supported

// auto-start all three
var deep = new CronJob({
  cronTime: '0 0 * * * *', // seconds included 6 params - standard 5 params supported
  onTick: tasks.deep,
  start: true // default is true, else, if start:false, use job.start()
  // timeZone: "America/Montreal" // npm install time, if you want to use TZ
});

var shallow = new CronJob({
  cronTime: '0 3-59/10 * * * *', // seconds included 6 params - standard 5 params supported
  onTick: tasks.shallow,
  start: true // default is true, else, if start:false, use job.start()
  // timeZone: "America/Montreal" // npm install time, if you want to use TZ
});

var quick = new CronJob({
  cronTime: '0 4-59/10 * * * *', // seconds included 6 params - standard 5 params supported
  onTick: tasks.quick,
  start: true // default is true, else, if start:false, use job.start()
  // timeZone: "America/Montreal" // npm install time, if you want to use TZ
});

// make this process hang around
// closing stdin (^D/EOF) will exit.
process.stdin.resume();