"use strict";

var credentials = require('./credentials.json');
var Promise = require("bluebird");
var rp = require('request-promise');
var jar = rp.jar();

var baseUri = 'https://play.pocketcasts.com';
var sign_in = '/users/sign_in';
var podcasts_all = '/web/podcasts/all.json';
var new_releases_episodes = '/web/episodes/new_releases_episodes.json';
var in_progress_episodes = '/web/episodes/in_progress_episodes.json';
var find_by_podcast = '/web/episodes/find_by_podcast.json';

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

// Login process:
// GET /users/sign_in, to get cookies (XSRF-TOKEN)
// POST form to /users/sign_in, with authenticity_token and credentials
//  Note: the POST returns a 302, which rejects the promise, 
//  whereas a faled login returns the login page content again (200)
//  the 302 response also has a new XSRF-TOKEN cookie
rp({
  jar: jar,
  uri: baseUri + sign_in,
  resolveWithFullResponse: true
})
  .then(function(response) {
    // TODO clone credentials, and add authenticity_token
    credentials.authenticity_token = XSRF();

    // now do a form post for login, expect a 302, which is not followed for POST.        
    // unless followAllRedirects: true, but that only follows back to / and causes an extra fetch
    return new Promise(function(resolve, reject) {
      rp({
        jar: jar,
        uri: baseUri + sign_in,
        method: 'POST',
        headers: {
          'X-XSRF-TOKEN': XSRF()
        },
        form: credentials,
      }).then(function(response) {
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
    console.log('XSRF', XSRF());
  })
  .then(function() {
    return rp({
      jar: jar,
      uri: baseUri + new_releases_episodes,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json;charset=UTF-8',
        'X-XSRF-TOKEN': XSRF()
      },
      json: {},
      // body:'{}',
      // resolveWithFullResponse: true
    }).then(function(response) {
      console.log('XSRF', XSRF());
      console.log('new_releases_episodes:', response.episodes.length);
      return response;
    });
  })
  .then(function() {
    return rp({
      jar: jar,
      uri: baseUri + in_progress_episodes,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json;charset=UTF-8',
        'X-XSRF-TOKEN': XSRF()
      },
      json: {},
    }).then(function(response) {
      console.log('XSRF', XSRF());
      console.log('in_progress_episodes:', response.episodes.length);
      return response;
    });
  })
  .then(function() {
    return rp({
      jar: jar,
      uri: baseUri + podcasts_all,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json;charset=UTF-8',
        'X-XSRF-TOKEN': XSRF()
      },
      json: {},
    }).then(function(response) {
      console.log('XSRF', XSRF());
      console.log('podcasts_all:', response.podcasts.length);
      return response;
    });
  })
  .then(function() {
    // adventures in angluar
    var uuid = "80931490-01be-0132-a0fb-5f4c86fd3263";
    return rp({
      jar: jar,
      uri: baseUri + find_by_podcast,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json;charset=UTF-8',
        'X-XSRF-TOKEN': XSRF()
      },
      json: {
        uuid: uuid,
        page: 1
      },
    }).then(function(response) {
      console.log('XSRF', XSRF());
      console.log('find_by_podcast:', response);
      return response;
    });
  })
  .then(function() {
    // History of Rome
    var uuid = "e4b6efd0-0424-012e-f9a0-00163e1b201c";

    return rp({
      jar: jar,
      uri: baseUri + find_by_podcast,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json;charset=UTF-8',
        'X-XSRF-TOKEN': XSRF()
      },
      json: {
        uuid: uuid,
        page: 16
      },
    }).then(function(response) {
      console.log('XSRF', XSRF());
      console.log('find_by_podcast: HoR', response);
      return response;
    });
  })
  .catch(function(error) {
    console.log('+++catch+++ ERROR', error);
  });