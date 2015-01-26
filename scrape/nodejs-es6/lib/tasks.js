"use strict";

// There are three scraping tasks:
// -quick (only 03-new-releases/04-in_progress)
// -shallow: implies quick
// -deep : implies shallow, and threfore quick

// dependencies - core-public-internal
var util = require('util');
var Promise = require("bluebird");
var rp = require('request-promise');
var _ = require('lodash');
// mine
var PocketAPI = require('./pocketAPI');
var utils = require('./utils');
var sinkFile = require('./sink/file');

// Exported API
var exports = module.exports = {
  quick: quick,
  shallow: shallow,
  deep: deep
};

function quick(credentials) {
  lifecycle('quick', 'start', credentials.name);
  var apiSession = new PocketAPI({
    stamp: utils.stamp('minute')
  });
  return apiSession.sign_in(credentials)
    .then(quickWithSession(apiSession));
}

function shallow(credentials) {
  var isDeep = false;
  return scrape(credentials, isDeep);
}

function deep(credentials) {
  var isDeep = true;
  return scrape(credentials, isDeep);
}

function quickWithSession(apiSession) {
  return function() {
    return Promise.resolve(42)
      .then(apiSession.new_releases())
      .then(function(response) {
        progress('03-new_releases', response);
        sinkFile.writeByUserStamp(response);
      })
      .then(apiSession.in_progress())
      .then(function(response) {
        progress('04-in_progress', response);
        sinkFile.writeByUserStamp(response);
      })
      .then(function() {
        lifecycle('quick', 'done', apiSession.user);
      })
      .catch(function(error) {
        console.log('tasks.quick:', error);
        throw error;
      });
  }

}

// get podcasts then foreach: podcastPages->file
function scrape(credentials, isDeep) {
  // this shoulbe isolated/shared in Session: return by sign_in.
  var apiSession = new PocketAPI({
    stamp: utils.stamp('minute')
  });
  var mode = isDeep ? 'deep' : 'shallow';
  lifecycle(mode, 'start', credentials.name); // ? apiSession.stamp

  return apiSession.sign_in(credentials)
    .then(apiSession.podcasts())
    .then(function(response) {
      sinkFile.writeByUserStamp(response);
      progress('01-podcasts', response);
      return response
    })
    .then(function(podcasts) {
      utils.logStamp('Found ' + podcasts.length + ' podcasts');

      // just for lookupFun
      var podcastByUuid = _.groupBy(podcasts, 'uuid');
      // assert unique uuids - 

      return Promise.map(_.pluck(podcasts, 'uuid'), function(uuid) {
        utils.logStamp('Fetching: ' + podcastByUuid[uuid][0].title);

        return Promise.resolve(42)
          .then(apiSession.podcastPages({
            uuid: uuid,
            maxPage: isDeep ? 0 : 1,
          }))
          .then(function(response) {
            sinkFile.writeByUserStamp(response);
            progress('02-podcasts', response);
            return response;
          })
      }, {
        concurrency: 1
      });
    })
    .then(function() {
      lifecycle(mode, 'done', apiSession.user);
    })
    // .then(quickWithSession(apiSession))
    .catch(function(error) {
      console.log('tasks.scrape:', mode, error);
      throw error;
    });
}


//--- Utility functions
// Task quick: start for daniel
function lifecycle(task, verb, user) {
  var out = util.format('Task %s: %s for %s', task, verb, user);
  utils.logStamp(out);
}

function progress(msg, response) {
  var out = util.format('|%s|: %d', msg, response.length);
  utils.logStamp(out);
}