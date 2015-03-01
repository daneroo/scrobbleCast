'use strict';

var rp = require('request-promise');
var _ = require('lodash');

// This Object represents the http session context (with it's cookie jar)
function Session() {
  this.jar = rp.jar();
}

// base for all requests.
Session.prototype.baseURI = 'https://play.pocketcasts.com';

// TODO: we can actually wrap this with rp,
// or find another way to wrap both rp, and ratelimitting in one decorator.
Session.prototype.reqJSON = function(path, params) {
  return this.reqGenXSRF(path, {
    headers: {
      'Content-Type': 'application/json;charset=UTF-8'
    },
    json: params || {},
  });
};

Session.prototype.reqGenXSRF = function(path, options) {
  var o = _.merge(this.reqGen(path, {
    method: 'POST',
    headers: {
      'X-XSRF-TOKEN': this.XSRF()
    }
  }), options);
  // console.log('*X*', o.headers['X-XSRF-TOKEN'] );
  // console.log('*R*', JSON.stringify(o, function(key, value) {
  //   return (key === "jar") ? undefined : value;
  // }));
  return o;
};

// Generate a new option base for request invocation (rp)
// dependency on lodash's `_.merge` deep copy.
Session.prototype.reqGen = function(path, options) {
  return _.merge({
    jar: this.jar,
    uri: this.baseURI + path,
  }, options);
};

// Cookie helpers

Session.prototype.XSRF = function() {
  // for XSRF we decodeURIComponent(value)
  return decodeURIComponent(this.getCookieValue('XSRF-TOKEN'));
};

Session.prototype.getCookieValue = function(name) {
  var cookies = this.jar.getCookies(this.baseURI);
  // console.log('--=-=-= jar.getCookieString', jar.getCookieString('https://play.pocketcasts.com'));

  var value;
  cookies.forEach(function(cookie) {
    //console.log('*** jar.eachCookie:', cookie.key,' = ',cookie.value);
    if (name === cookie.key) {
      value = cookie.value;
    }
  });
  return value;
};

exports = module.exports = Session;
