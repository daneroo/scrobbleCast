"use strict";
// dependencies
var Promise = require("bluebird");
var rp = require('request-promise');
var helper = require('./lib/reqHelpers');
var _ = require('lodash');

// globals
// external data for creds.
var credentials = require('./credentials.json');


var sign_in = '/users/sign_in';
var podcasts_all = '/web/podcasts/all.json';
var new_releases_episodes = '/web/episodes/new_releases_episodes.json';
var in_progress_episodes = '/web/episodes/in_progress_episodes.json';
var find_by_podcast = '/web/episodes/find_by_podcast.json';



// Login process:
// GET /users/sign_in, to get cookies (XSRF-TOKEN)
// POST form to /users/sign_in, with authenticity_token and credentials
//  Note: the POST returns a 302, which rejects the promise, 
//  whereas a faled login returns the login page content again (200)
//  the 302 response also has a new XSRF-TOKEN cookie
rp(helper.reqGen(sign_in, {
  resolveWithFullResponse: true
}))
  .then(function(response) {
    var form = _.merge({
      authenticity_token: helper.XSRF()
    }, credentials);

    // now do a form post for login, expect a 302, which is not followed for POST.        
    // unless followAllRedirects: true, but that only follows back to / and causes an extra fetch
    return new Promise(function(resolve, reject) {
      rp(helper.reqGenXSRF(sign_in, {
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
  .then(function() {
    return rp(helper.reqJSON(new_releases_episodes)).then(function(response) {
      console.log('XSRF', helper.XSRF());
      console.log('new_releases_episodes:', response.episodes.length);
      return response;
    });
  })
  .then(function() {
    return rp(helper.reqJSON(in_progress_episodes)).then(function(response) {
      console.log('XSRF', helper.XSRF());
      console.log('in_progress_episodes:', response.episodes.length);
      return response;
    });
  })
  .then(function() {
    return rp(helper.reqJSON(podcasts_all)).then(function(response) {
      console.log('XSRF', helper.XSRF());
      console.log('podcasts_all:', response.podcasts.length);
      return response;
    });
  })
  .then(function() {
    var json = {
      uuid: "80931490-01be-0132-a0fb-5f4c86fd3263", // adventures in angluar
      page: 1
    }
    return rp(helper.reqJSON(find_by_podcast, json)).then(function(response) {
      console.log('XSRF', helper.XSRF());
      console.log('find_by_podcast:AiA', JSON.stringify(response,null,2));
      return response;
    });
  })
  .then(function() {
    var json = {
      uuid: "e4b6efd0-0424-012e-f9a0-00163e1b201c", // History of Rome
      page: 16
    }
    return rp(helper.reqJSON(find_by_podcast, json)).then(function(response) {
      console.log('XSRF', helper.XSRF());
      console.log('find_by_podcast:HoR', JSON.stringify(response,null,2));
      return response;
    });
  })
  .catch(function(error) {
    console.log('+++catch+++ ERROR', error);
  });