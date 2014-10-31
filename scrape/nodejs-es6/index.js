"use strict";

var rp = require('request-promise');
var jar = rp.jar();

//this how we could set a global default ?
// request = request.defaults({
//   jar: jar
// })

var uri = 'https://play.pocketcasts.com/';
rp({
  jar: jar,
  uri: uri,
  resolveWithFullResponse: true
}).then(function(response) {
  var cookies = jar.getCookies(uri);

  var XSRF;
  cookies.forEach(function(cookie) {
    // console.log('jar.eachCookie:', cookie);      
    if ("XSRF-TOKEN" === cookie.key) {
      XSRF = cookie.value;
    }
  });
  return XSRF;
}).then(function(XSRF) {
  console.log('XSRF:', XSRF);

  // now do a post
  return rp({
    jar: jar,
    uri: uri,
    resolveWithFullResponse: true
  });
}).catch(console.error);