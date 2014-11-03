"use strict";

var rp = require('request-promise');
var _ = require('lodash');
//  jar singleton to persist cookies (for now)
var jar = rp.jar();

// base for all requests.
var baseUri = 'https://play.pocketcasts.com';

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

// Generate a new option base for request invocation (rp)
// dependency on lodash's `_.merge` deep copy.
function reqGen(path, options) {
  return _.merge({
    jar: jar,
    uri: baseUri + path,
  }, options);
}

// Cookie helpers

function XSRF() {
  // for XSRF we decodeURIComponent(value)
  return decodeURIComponent(getCookieValue('XSRF-TOKEN'));
}

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

var exports = module.exports = {
  baseUri:baseUri,
  getCookieValue: getCookieValue,
  XSRF: XSRF,
  reqGen: reqGen,
  reqGenXSRF: reqGenXSRF,
  reqJSON: reqJSON
};