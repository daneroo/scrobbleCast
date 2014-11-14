"use strict";

var Promise = require("bluebird");
var rp = require('request-promise');
var _ = require('lodash');
var helper = require('./reqHelpers');
var RateLimiter = require('limiter').RateLimiter;

// globals limiter might be configures, injected, credentials as well...
var limiter = new RateLimiter(20, 1000);
var paths = {
  sign_in: '/users/sign_in',
  podcasts_all: '/web/podcasts/all.json',
  new_releases_episodes: '/web/episodes/new_releases_episodes.json',
  in_progress_episodes: '/web/episodes/in_progress_episodes.json',
  find_by_podcast: '/web/episodes/find_by_podcast.json'
}

// curry the path param
function rebind(path) {
  return function(params) {
    // console.log('defined with params', params, path);
    return function() {
      // console.log('invoked with params', params, path);
      return speedLimit()
        .then(fetch(path, params));
    };
  }
}


// promise token.
function speedLimit(input) {
  return new Promise(function(resolve, reject) {
    // console.log(new Date().toJSON().substr(0, 19), 'YELLOW');
    limiter.removeTokens(1, function() {
      // console.log(new Date().toJSON().substr(0, 19), 'GREEN');
      return resolve(input);
    });
  });
}

// JSON post with param (requires prior login)
function fetch(path, params) {
  var verbose=false;
  return function() {
    // if (params && params.page){
    //   console.log('fetching page',params.page);
    // }
    return rp(helper.reqJSON(path, params))
      .then(function(response) {
        if (verbose){
          console.log('* path', path);
          if (response.episodes) {
            console.log('    * episodes', response.episodes.length);
          }
          if (response.podcasts) {
            console.log('    * podcasts', response.podcasts.length);
          }
          if (response.result && response.result.episodes) {
            console.log('    * podcasts.page len,total:', response.result.episodes.length,response.result.total);
          }
        }
        return response;
      });
  }
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
            console.log('Login OK: Got expected redirection: 302');
            resolve('Login OK');
          } else {
            console.log('Got unexpected ERROR, reject.', error);
            reject(error);
          }
        });
      });
    })
}

// Exported API
var exports = module.exports = {
  sign_in: sign_in,
  podcasts_all: rebind(paths.podcasts_all),
  new_releases_episodes: rebind(paths.new_releases_episodes),
  in_progress_episodes: rebind(paths.in_progress_episodes),
  find_by_podcast: rebind(paths.find_by_podcast),
  speedLimit: speedLimit
};