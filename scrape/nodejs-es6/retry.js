"use strict";

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
setInterval(iteration,10000);
