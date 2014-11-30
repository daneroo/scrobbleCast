"use strict";

var Promise = require("bluebird");
var rp = require('request-promise');
var _ = require('lodash');
var helper = require('./reqHelpers');
var RateLimiter = require('limiter').RateLimiter;
// mine
var API = require('./pocketAPI');
var utils = require('./utils');
var sinkFile = require('./sink/file');

// globals - move to configuration (ENV|config)
// limiter (or config)
//  - var limiter = new RateLimiter(20, 1000);
// this shoulbe isolated/shared in Session: return by sign_in.
var sessionStamp = utils.stamp('minute');
// - credentials
var credentials = require('../credentials.json');

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
        if (!result.episodes.podcast_uuid){
          result.episodes.podcast_uuid=uuid;
          console.log('injected podcast_uuid',result.episodes.podcast_uuid);
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

function quick() {
  utils.logStamp('Start scraping (quick)');
  return API.sign_in(credentials)
    .then(API.new_releases_episodes())
    .then(function(response) {
      sinkFile.writeByDate('03-new_releases', response);
    })
    .then(API.in_progress_episodes())
    .then(function(response) {
      sinkFile.writeByDate('04-in_progress', response);
    })
    .then(function(response) {
      utils.logStamp('Done scraping (quick)');
    });
}


// generalize: concurrelcy/shallow (Session?)
function scrape(isDeep) {
  // this shoulbe isolated/shared in Session: return by sign_in.
  var sessionStamp = utils.stamp('minute');
  var mode = isDeep ? 'deep' : 'shallow';
  utils.logStamp('Start scraping (' + mode + ') ' + sessionStamp);
  return API.sign_in(credentials)
    .then(API.podcasts_all())
    .then(function(response) {
      sinkFile.writeByDate('01-podcasts', response, sessionStamp);
      return response.podcasts;
    })
    .then(function(podcasts) {
      utils.logStamp('Found ' + podcasts.length + ' podcasts');

      // just for lookupFun
      var podcastByUuid = _.groupBy(podcasts, 'uuid');
      // assert unique uuids - 

      return Promise.map(_.pluck(podcasts, 'uuid'), function(uuid) {
        utils.logStamp('Fetching: ' + podcastByUuid[uuid][0].title);
        return fetchall(uuid, sessionStamp, isDeep)();
      }, {
        concurrency: 1
      });
    })
    .then(function(podcasts) {
      utils.logStamp('Done scraping (' + mode + ') ' + sessionStamp);
    });
}

function shallow() {
  var isDeep = false;
  return scrape(isDeep);
}

function deep() {
  var isDeep = true;
  return scrape(isDeep);
}

// Exported API
var exports = module.exports = {
  quick: quick,
  shallow: shallow,
  deep: deep
};