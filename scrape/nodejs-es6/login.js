"use strict";

var credentials = require('./credentials.json');
var Promise = require("bluebird");
var rp = require('request-promise');
var jar = rp.jar();

var baseUri = 'https://play.pocketcasts.com';
// var url = '/web/podcasts/all.json';
// var url = '/web/episodes/new_releases_episodes.json';
var url = '/web/episodes/in_progress_episodes.json';
var sign_in = '/users/sign_in';

function getCookieValue(name) {
  var cookies = jar.getCookies(baseUri);
  // console.log('--=-=-= jar.getCookieString', jar.getCookieString('https://play.pocketcasts.com'));

  var value;
  cookies.forEach(function(cookie) {
    //console.log('*** jar.eachCookie:', cookie.key,' = ',cookie.value);
    //cookie.value = decodeURIComponent(cookie.value);
    if (name === cookie.key) {
      // value = cookie.value;
      value = decodeURIComponent(cookie.value);
    }
  });
  return value;
}

rp({
  jar: jar,
  uri: baseUri + sign_in,
  resolveWithFullResponse: true
})
  .then(function(response) {
    console.log('-------------');
    var XSRF = getCookieValue('XSRF-TOKEN');
    console.log('XSRF:', getCookieValue('XSRF-TOKEN'));

    // TODO clone credentials
    credentials.authenticity_token = XSRF;
    // console.log('credentials:', credentials);

    // now do a form post for login, expect a 302, which is not followed for POST.
    return new Promise(function(resolve, reject) {
      rp({
        jar: jar,
        uri: baseUri + sign_in,
        method: 'POST',
        headers: {
          'X-XSRF-TOKEN': XSRF
        },
        form: credentials,
      }).then(function(response) {
        console.log('response OK?', response)
        reject('Login NOT OK');
      }).catch(function(error) { // error: {error:,options,response,statusCode}
        // console.log('*** code', error.statusCode);
        // console.log('*** location', error.response.headers.location);
        if (error.statusCode === 302 && error.response.headers.location === baseUri + '/') {
          console.log('  ++ expected 302 ERROR');
          resolve('Login OK');
        } else {
          // console.error(JSON.stringify(error, null, 2));
          reject(error);
        }
      });
    });
  })
  .then(function(response) {
    console.log('XSRF:', getCookieValue('XSRF-TOKEN'));
    return response;
  })
  .then(function(response) {
    console.log('XSRF:', getCookieValue('XSRF-TOKEN'));
    return response;
  })
  .catch(function(error) {
    console.log('+++catch+++ ERROR');
    console.log('-------------');
    console.log('XSRF:', getCookieValue('XSRF-TOKEN'));
  });