"use strict";

// dependencies - core-public-internal
var Promise = require("bluebird");
var rp = require('request-promise');
var _ = require('lodash');
// mine
var PocketAPI = require('./pocketAPI');
var utils = require('./utils');
var sinkFile = require('./sink/file');


//TODO: clean this up!
function fetchall(uuid, stamp, isDeep) {
  // local util
  // this should be moved to API, as it is the only place we call this path from, 
  // and we need the podcast_uuid inkjection fix.
  // Also note that a fix for older files without the fix is in ./lib/delta.js/merge with a detailed explanation
  function fetchPage(page) {
    // console.log('   -- podcasts.page', page);
    return API.find_by_podcast({
        uuid: uuid,
        page: page
      })() // yes invoke it.
      .then(function(response) {
        if (!response || !response.result || !response.result.episodes) {
          throw new Error('Unexpected or malformed response');
        }
        return response.result;
      })
      .then(function(result) {
        // this is the podcast_uuid injection fix
        if (!result.episodes.podcast_uuid) {
          result.episodes.podcast_uuid = uuid;
          console.log('injected podcast_uuid', result.episodes.podcast_uuid);
        }
        return result;
      });
    // could also normalize response here (return the episodes attr directly)
  };

  // actual task
  return function _fetchAll() {
    var accum = [];
    return fetchPage(1)
      .then(function(result) {
        var perPage = 12;
        var totalPages = Math.ceil(result.total / perPage);
        console.log('   ** podcasts.page 1 of ', totalPages, ' #podcasts:', result.total);
        accum = result.episodes;

        if (!isDeep || totalPages == 1) {
          return accum;
        }

        // otherwise append the other pages
        // [2..totalPages]
        var restOfPages = _.times(totalPages - 1, function(page) {
          return page + 2;
        });

        return Promise.map(restOfPages, fetchPage, {
            concurrency: 2
          })
          .then(function(pages) {
            // console.log('pages',pages);
            pages = _.pluck(pages, 'episodes');
            accum = accum.concat(_.flatten(pages));
            return accum;
          });
      })
      .then(function(accum) {
        utils.logStamp('Fetched ' + accum.length + ' episodes');
        sinkFile.writeByDate('02-podcasts/' + uuid, accum, stamp);
        return accum;
      });

  }
}

function show(msg, response) {
  console.log('|%s|: %d', msg, response.length);
  // console.log(_.pluck(response.slice(0, 2), 'title'));
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
      // sinkFile.writeByUserStamp(response);
      show('03-new_releases', response);
    })
    .then(apiSession.in_progress())
    .then(function(response) {
      show('04-in_progress', response);
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
            // console.log('02-podcasts', response);
            // sinkFile.writeByUserStamp(response);
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