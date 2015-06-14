"use strict";

// This is an example script, based on index.js
// It is meant to exercise the API under request error conditions

// dependencies - core-public-internal
var Promise = require('bluebird');
var PocketAPI = require('./lib/pocketAPI');
var utils = require('./lib/utils');

// tasks.deep();
// tasks.shallow();
// tasks.quick();

var log = console.log;
var allCredentials = require('./credentials.json');


function onething(credentials) {
  log('-Start', credentials.name);
  var apiSession = new PocketAPI({
    stamp: utils.stamp('minute')
  });
  return apiSession.sign_in(credentials)
    .then(function(response) {
      log('  -00-login', credentials.name);
    })
    .then(apiSession.in_progress())
    .then(function(response) {
      log('  -04-in_progress', credentials.name, response.length);
    })
    .then(apiSession.podcasts())
    .then(function(response) {
      log('  -01-podcasts', credentials.name, response.length);
    })
    .then(apiSession.podcastPages({
      // maxPage:10,
      // page: 1,
      // Spark from CBC Radio  05ccf3c0-1b97-012e-00b7-00163e1b201c
      uuid: '05ccf3c0-1b97-012e-00b7-00163e1b201c'
        // TNT (>900 episodes)
        // uuid: '77170eb0-0257-012e-f994-00163e1b201c'
        // Wachtel on the Arts from CBC Radio's Ideas
        // uuid:'89beea90-5edf-012e-25b7-00163e1b201c'
    }))
    .then(function(response) {
      log('  -02-podcasts', credentials.name, response.length);
    })

  .then(function() {
      log('-Done', credentials.name);
      return credentials.name;
    })
    .catch(function(error) {
      log('-Error', error);
      // throw error;
      return credentials.name;
    });
}


function iteration() {
  Promise.each(allCredentials, function(credentials) {
    return onething(credentials);
  }).then(function() {
    log('Done all');
  });

}

iteration();
setInterval(iteration, 10000);
