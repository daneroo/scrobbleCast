"use strict";

// dependencies - core-public-internal
var Promise = require("bluebird");
var rp = require('request-promise');
var _ = require('lodash');
// mine
var PocketAPI = require('./pocketAPI');
var utils = require('./utils');
var sinkFile = require('./sink/file');


function show(msg, response) {
  console.log('|%s|: %d', msg, response.length);
  // console.log(_.pluck(response.slice(0, 2), 'title'));
  // console.log(_.pluck(response.slice(0, 20), '__page'));
  // console.log('totalPages',_.pluck(response, '__totalPages'));
}

function quick(credentials) {
  utils.logStamp('Start scraping (quick)');
  var apiSession = new PocketAPI({
    stamp: utils.stamp('minute')
  });
  return apiSession.sign_in(credentials)
    .then(apiSession.new_releases())
    .then(function(response) {
      show('03-new_releases', response);
      sinkFile.writeByUserStamp(response);
    })
    .then(apiSession.in_progress())
    .then(function(response) {
      show('04-in_progress', response);
      sinkFile.writeByUserStamp(response);
    })
    .then(function() {
      utils.logStamp('Done scraping (quick)');
    })
    .catch(function(error) {
      console.log('tasks.quick:', error);
      throw error;
    });
}


// get podcasts then foreach: podcastPages->file
function scrape(credentials, isDeep) {
  // this shoulbe isolated/shared in Session: return by sign_in.
  var apiSession = new PocketAPI({
    stamp: utils.stamp('minute')
  });
  var mode = isDeep ? 'deep' : 'shallow';
  utils.logStamp('Start scraping (' + mode + ') ' + apiSession.stamp);
  return apiSession.sign_in(credentials)
    .then(apiSession.podcasts())
    .then(function(response) {
      // sinkFile.writeByUserStamp(response, apiSession);
      show('01-podcasts', response);
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
            show('02-podcasts', response);
            return response;
          })
      }, {
        concurrency: 1
      });
    })
    .then(function(podcasts) {
      utils.logStamp('Done scraping (' + mode + ') ' + apiSession.stamp);
    })
    .catch(function(error) {
      console.log('tasks.scrape:', mode, error);
      throw error;
    });
}

function shallow(credentials) {
  var isDeep = false;
  return scrape(credentials,isDeep);
}

function deep(credentials) {
  var isDeep = true;
  return scrape(credentials,isDeep);
}

// Exported API
var exports = module.exports = {
  quick: quick,
  shallow: shallow,
  deep: deep
};