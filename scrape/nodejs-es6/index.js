"use strict";

// dependencies - core-public-internal
var tasks = require('./lib/tasks');
var _ = require('lodash');
var PocketAPI = require('./lib/pocketAPI');
var utils = require('./lib/utils');
var sinkFile = require('./lib/sink/file');


// tasks.deep();
// tasks.shallow();
// tasks.quick();



function show(msg, response) {
  console.log('\n |%s|:%d', msg, response.length);
  // console.log(_.pluck(response.slice(0, 2), 'title'));
  // console.log(_.pluck(response.slice(0, 2), '__stamp'));
  // console.log('totalPages',_.pluck(response, '__totalPages'));
  // console.log(_.pluck(rr.slice(0, 2), '__type'));
  // console.log(_.pluck(rr.slice(0, 2), '__sourceType'));
  // console.log(_.pluck(rr.slice(0, 2), '__user'));
  // console.log('[0]=>', response[0]);
  // console.log('[..4]=>', JSON.stringify(response.slice(0, 4),null,2));
}

function tryemall(credentials) {
  utils.logStamp('Start Try-em-all');
  var apiSession = new PocketAPI({
    stamp: utils.stamp('minute')
  });
  return apiSession.sign_in(credentials)
    .then(apiSession.podcasts())
    .then(function(response) {
      show('01-podcasts', response);
      // sinkFile.writeByUserStamp(response);
    })
    .then(apiSession.podcastPages({
      // maxPage:10,
      // page: 1,
      // Spark from CBC Radio  05ccf3c0-1b97-012e-00b7-00163e1b201c    
      uuid: '05ccf3c0-1b97-012e-00b7-00163e1b201c'
      // TNT
      // uuid: '77170eb0-0257-012e-f994-00163e1b201c'
      // Wachtel on the Arts from CBC Radio's Ideas
      // uuid:'89beea90-5edf-012e-25b7-00163e1b201c'
    }))
    .then(function(response) {
      // console.log('02-podcasts', response);
      show('02-podcasts', response);
      // sinkFile.writeByUserStamp(response);
    })
    .then(apiSession.new_releases())
    .then(function(response) {
      show('03-new_releases', response);
      // sinkFile.writeByUserStamp(response);
    })
    .then(apiSession.in_progress())
    .then(function(response) {
      show('04-in_progress', response);
      // sinkFile.writeByUserStamp(response);
    })
    .then(function(response) {
      utils.logStamp('Done Try-em-all');
    })
    .catch(function(error) {
      console.log('Try-em-all:', error);
      throw error;
    });
}

var allCredentials = require('./credentials.json');
utils.serialPromiseChainMap(allCredentials, function(credentials) {
  utils.logStamp('Starting job for '+credentials.name);
  return tryemall(credentials);
  // return tasks.quick(credentials);
  // return tasks.shallow(credentials);
  // return tasks.deep(credentials);
})