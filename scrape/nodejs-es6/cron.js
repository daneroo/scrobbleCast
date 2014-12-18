"use strict";

// dependencies - core-public-internal
var fs = require('fs');
var path = require('path');
var mkdirp = require('mkdirp');
var cron = require('cron');
var CronJob = cron.CronJob;
var tasks = require('./lib/tasks');
var utils = require('./lib/utils');

// globals
var allCredentials = require('./credentials.json');


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
var recurrence = {
  everyHourOnTheHour: '0 0 * * * *',
  everyTenMinutesOffsetByThree: '0 3-59/10 * * * *',
  everyTenMinutesOffsetByFour: '0 4-59/10 * * * *',
  everyMinute: '0 * * * * *',
};

// serial executionof <task> for each credentialed user
// return a function
function forEachUser(task){
  return function(){
    return utils.serialPromiseChainMap(allCredentials, function(credentials) {
      utils.logStamp('Starting job for '+credentials.name);
      return task(credentials);
    });
  }
}
// auto-starts
function runJob(task, when) {
  var job = new CronJob({
    cronTime: when,
    onTick: forEachUser(task),
    start: true // default is true, else, if start:false, use job.start()
    // timeZone: "America/Montreal" // npm install time, if you want to use TZ
  });
  return job; // if you ever want to stop it.
}

// auto-start all three
runJob(tasks.deep,    recurrence.everyHourOnTheHour); // var deep = ...
runJob(tasks.shallow, recurrence.everyTenMinutesOffsetByThree); // var shallow = 
runJob(tasks.quick,   recurrence.everyTenMinutesOffsetByFour); // var quick = 
// runJob(tasks.quick,   recurrence.everyMinute); // var quick = 

// make this process hang around
// closing stdin (^D/EOF) will exit.
process.stdin.resume();
