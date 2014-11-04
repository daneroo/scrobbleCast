"use strict";

// dependencies
var API = require('./lib/pocketAPI');
var Promise = require("bluebird");
var _ = require('lodash');
// globals
// external data for creds.
var credentials = require('./credentials.json');

//TODO: clean this up!
function fetchall(uuid) {
  function fetchPage(page) {
    console.log('   -- podcasts.page', page);
    return API.find_by_podcast({
        uuid: uuid,
        page: page
      })() // yes invoke it.
      .then(function(response) {
        if (!response || !response.result || !response.result.episodes) {
          throw new Error('Unexpected or malformed response');
        }
        return response.result;
      });
  };
  return function() {
    var accum = [];
    return fetchPage(1)
      .then(function(result) {
        var perPage = 12;
        var totalPages = Math.ceil(result.total / perPage);
        console.log('   ** podcasts.page 1 of ', totalPages);
        accum = result.episodes;

        if (totalPages == 1) {
          return accum;
        }

        // otherwise append the other pages
        // [2..totalPages]
        var restOfPages = _.times(totalPages - 1, function(page) {
          return page + 2;
        });

        console.log('fetch the rest:', restOfPages);
        return Promise.map(restOfPages, fetchPage, {
            concurrency: 1
          })
          .then(function(pages) {
            // console.log('pages',pages);
            pages = _.pluck(pages, 'episodes');
            accum = accum.concat(_.flatten(pages));
            console.log('accum', _.pluck(accum, 'title')); // or title
            return accum
          });

      });
  }
}

// Adventures in Angluar
// History of Rome
API.sign_in(credentials)
  .then(API.new_releases_episodes())
  .then(API.in_progress_episodes())
  .then(API.find_by_podcast({
    uuid: "80931490-01be-0132-a0fb-5f4c86fd3263", // Adventures in Angluar
    page: 1
  }))
  .then(API.find_by_podcast({
    uuid: "e4b6efd0-0424-012e-f9a0-00163e1b201c", // History of Rome
    page: 16
  }))
  .then(fetchall("80931490-01be-0132-a0fb-5f4c86fd3263"))
  .then(fetchall("e4b6efd0-0424-012e-f9a0-00163e1b201c"))
  .then(API.podcasts_all())
  .then(function(response) {
    console.log('podcasts', _.pluck(response.podcasts, 'title'));
    return Promise.map(_.pluck(response.podcasts,'uuid'), function(uuid){
      console.log('-----fetchall', uuid);
      return fetchall(uuid)();
    }, {
      concurrency: 1
    });
  })
  .catch(function(error) {
    console.log('+++catch+++ ERROR', error);
  });