"use strict";
// dependencies
var Promise = require("bluebird");
var rp = require('request-promise');
var helper = require('./lib/reqHelpers');
var _ = require('lodash');

// globals
// external data for creds.
var credentials = require('./credentials.json');

var paths = {
  sign_in: '/users/sign_in',
  podcasts_all: '/web/podcasts/all.json',
  new_releases_episodes: '/web/episodes/new_releases_episodes.json',
  in_progress_episodes: '/web/episodes/in_progress_episodes.json',
  find_by_podcast: '/web/episodes/find_by_podcast.json'
}

function rebind(path) {
  return function(params) {
    // console.log('defined with params', params, path);
    return function() {
      // console.log('invoked with params', params, path);
      return fetch(path, params)
    }
  }
}
// JSON post with param (requires prior login)
function fetch(path, params) {
  return rp(helper.reqJSON(path, params))
    .then(function(response) {
      // console.log('XSRF', helper.XSRF());
      console.log('* path',path);
      if (response.episodes) {
        console.log('    * episodes', response.episodes.length);
      }
      if (response.podcasts) {
        console.log('    * podcasts', response.podcasts.length);
      }
      if (response.result && response.result.episodes) {
        console.log('    * podcasts.page', response.result.total, response.result.episodes.length);
      }
      return response;
    });
}
// not a function factory actually invokes login.
function sign_in(credentials) {
  // Login process:
  // GET /users/sign_in, to get cookies (XSRF-TOKEN)
  // POST form to /users/sign_in, with authenticity_token and credentials
  //  Note: the POST returns a 302, which rejects the promise, 
  //  whereas a faled login returns the login page content again (200)
  //  the 302 response also has a new XSRF-TOKEN cookie
  return rp(helper.reqGen(paths.sign_in, {
      resolveWithFullResponse: true
    }))
    .then(function(response) {
      var form = _.merge({
        authenticity_token: helper.XSRF()
      }, credentials);

      // now do a form post for login, expect a 302, which is not followed for POST.        
      // unless followAllRedirects: true, but that only follows back to / and causes an extra fetch
      return new Promise(function(resolve, reject) {
        rp(helper.reqGenXSRF(paths.sign_in, {
          form: form
        })).then(function(response) {
          console.log('response OK, expecting 302, reject.', response);
          reject('Login NOT OK');
        }).catch(function(error) { // error: {error:,options,response,statusCode}
          if (error.statusCode === 302 && error.response.headers.location === helper.baseUri + '/') {
            console.log('Got expected 302 ERROR, resolving');
            resolve('Login OK');
          } else {
            console.log('Got unexpected ERROR, reject.', error);
            reject(error);
          }
        });
      });
    })
}
var API = {
  sign_in: sign_in,
  podcasts_all: rebind(paths.podcasts_all),
  new_releases_episodes: rebind(paths.new_releases_episodes),
  in_progress_episodes: rebind(paths.in_progress_episodes),
  find_by_podcast: rebind(paths.find_by_podcast)
};

API.sign_in(credentials)
  .then(API.new_releases_episodes())
  .then(API.in_progress_episodes())
  .then(API.podcasts_all())
  .then(API.find_by_podcast({
    uuid: "80931490-01be-0132-a0fb-5f4c86fd3263", // adventures in angluar
    page: 1
  }))
  .then(API.find_by_podcast({
    uuid: "e4b6efd0-0424-012e-f9a0-00163e1b201c", // History of Rome
    page: 16
  }))
  .catch(function(error) {
    console.log('+++catch+++ ERROR', error);
  });