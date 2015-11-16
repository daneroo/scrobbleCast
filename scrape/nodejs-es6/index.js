'use strict';

// This is meant to exercise the fetch API
// Can use it to test under request error conditions

// dependencies - core-public-internal
var Promise = require('bluebird');
var PocketAPI = require('./lib/pocketAPI');
var utils = require('./lib/utils');
var log = require('./lib/log');

var allCredentials = require('./credentials.json');

function tryemall(credentials) {
  log.info('Start', credentials.name);
  var apiSession = new PocketAPI({
    stamp: utils.stamp('minute')
  });
  return apiSession.sign_in(credentials)
    .then(apiSession.podcasts())
    .then(function(response) {
      log.info('  01-podcasts', response.length);
    })
    .then(apiSession.podcastPages({
      // maxPage:3,
      // page: 1,
      // Spark from CBC Radio  05ccf3c0-1b97-012e-00b7-00163e1b201c
      uuid: '05ccf3c0-1b97-012e-00b7-00163e1b201c'
      // TNT
      // uuid: '77170eb0-0257-012e-f994-00163e1b201c'
      // Wachtel on the Arts from CBC Radio's Ideas
      // uuid:'89beea90-5edf-012e-25b7-00163e1b201c'
    }))
    .then(function(response) {
      log.info('  02-podcasts', response.length);
    })
    .then(apiSession.new_releases())
    .then(function(response) {
      log.info('  03-new_releases', response.length);
    })
    .then(apiSession.in_progress())
    .then(function(response) {
      log.info('  04-in_progress', response.length);
    })
    .then(function(response) {
      log.info('Done', credentials.name);
      return credentials.name;
    })
    .catch(function(error) {
      log.info('Error', JSON.stringify(error,null,2));
      // throw error;
      return credentials.name;
    });
}

function iteration() {
  Promise.each(allCredentials, function(credentials) {
    return tryemall(credentials);
    // return tasks.quick(credentials);
    // return tasks.shallow(credentials);
    // return tasks.deep(credentials);
  }).then(function() {
    log.info('Done all');
  });

}

iteration();
var itvl = setInterval(iteration, 10000);
// run thrice
setTimeout(function(){
  clearInterval(itvl);
},30000);
