"use strict";
// dependencies
var Promise = require("bluebird");
var rp = require('request-promise');
var _ = require('lodash');

// globals
// external data for creds.
var credentials = require('./credentials.json');
//  jar singleton to persist cookies (for now)
var jar = rp.jar();


var baseUri = 'https://play.pocketcasts.com';
var sign_in = '/users/sign_in';
var podcasts_all = '/web/podcasts/all.json';
var new_releases_episodes = '/web/episodes/new_releases_episodes.json';
var in_progress_episodes = '/web/episodes/in_progress_episodes.json';
var find_by_podcast = '/web/episodes/find_by_podcast.json';

// Cookie helpers
function getCookieValue(name) {
  var cookies = jar.getCookies(baseUri);
  // console.log('--=-=-= jar.getCookieString', jar.getCookieString('https://play.pocketcasts.com'));

  var value;
  cookies.forEach(function(cookie) {
    //console.log('*** jar.eachCookie:', cookie.key,' = ',cookie.value);
    if (name === cookie.key) {
      value = cookie.value;
    }
  });
  return value;
}

function XSRF() {
  // for XSRF we decodeURIComponent(value)
  return decodeURIComponent(getCookieValue('XSRF-TOKEN'));
}

// Generate a new option base for request invocation (rp)
// dependency on lodash's `_.merge` deep copy.
function reqGen(path, options) {
  return _.merge({
    jar: jar,
    uri: baseUri + path,
  }, options);
}

function reqGenXSRF(path, options) {
  var o = _.merge(reqGen(path, {
    method: 'POST',
    headers: {
      'X-XSRF-TOKEN': XSRF()
    }
  }), options);
  // console.log('*X*', o.headers['X-XSRF-TOKEN'] );
  // console.log('*R*', JSON.stringify(o, function(key, value) {
  //   return (key === "jar") ? undefined : value;
  // }));
  return o;
}

// TODO: we can actually wrap this with rp, 
// or find another way to wrap both rp, and ratelimitting in one decorator.
function reqJSON(path, params) {
  return reqGenXSRF(path, {
    headers: {
      'Content-Type': 'application/json;charset=UTF-8'
    },
    json: params || {},
  });
}

// Login process:
// GET /users/sign_in, to get cookies (XSRF-TOKEN)
// POST form to /users/sign_in, with authenticity_token and credentials
//  Note: the POST returns a 302, which rejects the promise, 
//  whereas a faled login returns the login page content again (200)
//  the 302 response also has a new XSRF-TOKEN cookie
rp(reqGen(sign_in, {
  resolveWithFullResponse: true
}))
  .then(function(response) {
    var form = _.merge({
      authenticity_token: XSRF()
    }, credentials);

    // now do a form post for login, expect a 302, which is not followed for POST.        
    // unless followAllRedirects: true, but that only follows back to / and causes an extra fetch
    return new Promise(function(resolve, reject) {
      rp(reqGenXSRF(sign_in, {
        form: form
      })).then(function(response) {
        console.log('response OK, expecting 302, reject.', response);
        reject('Login NOT OK');
      }).catch(function(error) { // error: {error:,options,response,statusCode}
        if (error.statusCode === 302 && error.response.headers.location === baseUri + '/') {
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
    return rp(reqJSON(new_releases_episodes)).then(function(response) {
      console.log('XSRF', XSRF());
      console.log('new_releases_episodes:', response.episodes.length);
      return response;
    });
  })
  .then(function() {
    return rp(reqJSON(in_progress_episodes)).then(function(response) {
      console.log('XSRF', XSRF());
      console.log('in_progress_episodes:', response.episodes.length);
      return response;
    });
  })
  .then(function() {
    return rp(reqJSON(podcasts_all)).then(function(response) {
      console.log('XSRF', XSRF());
      console.log('podcasts_all:', response.podcasts.length);
      return response;
    });
  })
  .then(function() {
    var json = {
      uuid: "80931490-01be-0132-a0fb-5f4c86fd3263", // adventures in angluar
      page: 1
    }
    return rp(reqJSON(find_by_podcast, json)).then(function(response) {
      console.log('XSRF', XSRF());
      console.log('find_by_podcast:AiA', JSON.stringify(response,null,2));
      return response;
    });
  })
  .then(function() {
    var json = {
      uuid: "e4b6efd0-0424-012e-f9a0-00163e1b201c", // History of Rome
      page: 16
    }
    return rp(reqJSON(find_by_podcast, json)).then(function(response) {
      console.log('XSRF', XSRF());
      console.log('find_by_podcast:HoR', JSON.stringify(response,null,2));
      return response;
    });
  })
  .catch(function(error) {
    console.log('+++catch+++ ERROR', error);
  });