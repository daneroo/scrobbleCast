"use strict";

// dependencies - core-public-internal
// var tasks = require('./lib/tasks');


// tasks.deep();
// tasks.shallow();
// tasks.quick();


var _ = require('lodash');
var PocketAPI = require('./lib/pocketAPI');
var utils = require('./lib/utils');

function show(msg, response) {
  var rr = response;
  console.log('\n',msg);
  console.log(_.pluck(rr.slice(0, 2), 'title'));
  // console.log(_.pluck(rr.slice(0, 2), 'type'));
  // console.log(_.pluck(rr.slice(0, 2), 'sourceType'));
  // console.log(_.pluck(rr.slice(0, 2), 'user'));
  // console.log('[0]=', response[0]);
}

function quick(credentials) {
  utils.logStamp('Start scraping (quick)');
  var apiSession = new PocketAPI();
  return apiSession.sign_in(credentials)
    .then(apiSession.podcasts())
    .then(function(response) {
      show('01-podcasts', response);
    })
    .then(apiSession.find_by_podcast({
      // Spark from CBC Radio  05ccf3c0-1b97-012e-00b7-00163e1b201c    
      uuid: '05ccf3c0-1b97-012e-00b7-00163e1b201c',
      page: 1
    }))
    .then(function(response) {
      // console.log('02-podcasts', response);
      show('02-podcasts', response);
    })
    .then(apiSession.new_releases())
    .then(function(response) {
      show('03-new_releases', response);
    })
    .then(apiSession.in_progress_episodes())
    .then(function(response) {
      show('04-in_progress', response);
    })
    .then(function(response) {
      utils.logStamp('Done scraping (quick)');
    })
    .catch(function(error) {
      console.log('tasks.quick:', error);
      throw error;
    });
}

var credentials = require('./credentials.json');
utils.serialPromiseChainMap(credentials, function(creds) {
  console.log('\n--creds', creds.name, creds['user[email]']);
  return quick(creds);
})