"use strict";

// dependencies - core-public-internal

var Promise = require("bluebird");
var rp = require('request-promise');
var _ = require('lodash');
var RateLimiter = require('limiter').RateLimiter;
var Session = require('./Session');
var utils = require('./utils');

// globals limiter might be configured, injected, credentials as well...
// var limiter = new RateLimiter(20, 1000);
var limiter = new RateLimiter(1, 1000);

function PocketAPI(options) {
  this.session = new Session();
  this.user = null; // set by sign_in
  // maybe default stamp should be time of fetch not time of session init...
  this.stamp = (options && options.stamp) ? options.stamp : utils.stamp('minute');
}

// the actual endpoints
var paths = {
  sign_in: '/users/sign_in',
  podcasts_all: '/web/podcasts/all.json',
  new_releases_episodes: '/web/episodes/new_releases_episodes.json',
  in_progress_episodes: '/web/episodes/in_progress_episodes.json',
  find_by_podcast: '/web/episodes/find_by_podcast.json'
}


// JSON post with param (requires prior login)
PocketAPI.prototype._fetch = function(path, params) {
  var self = this;
  var verbose = false;
  if (verbose && params && params.page) {
    console.log('fetching page', params.page);
  }
  return speedLimit()
    .then(function() {
      return rp(self.session.reqJSON(path, params))
        .then(function(response) {
          if (verbose) {
            console.log('* path', path);
            if (response.episodes) {
              console.log('    * episodes', response.episodes.length);
            }
            if (response.podcasts) {
              console.log('    * podcasts', response.podcasts.length);
            }
            if (response.result && response.result.episodes) {
              console.log('    * podcasts.page len,total:', response.result.episodes.length, response.result.total);
            }
          }
          return response;
        });
    });
};


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


function extractMember(sourceType, response) {
  if (sourceType === '01-podcasts') {
    // console.log('extract 01-podcasts');
    if (!response || !response.podcasts) {
      throw new Error('Unexpected or malformed response');
    }
    return response.podcasts;
  }
  if (sourceType === '02-podcasts') {
    if (!response || !response.result || !response.result.episodes) {
      throw new Error('Unexpected or malformed response');
    }
    return response.result.episodes;
  }
  if (sourceType === '03-new_releases' || sourceType === '04-in_progress') {
    if (!response || !response.episodes) {
      throw new Error('Unexpected or malformed response:' + sourceType);
    }
    return response.episodes;
  }
}

// Use this function to normalize output
// -remove response top level member: {podcasts:[..]} => [..]
// -inject __type/__sourceType: 01-podcasts|02-podcasts|03-new_releases|04-in_progress
// -inject __stamp, __podcast_uuid
function normalize(sourceType, self, extra) {
  return function(response) {
    var items = extractMember(sourceType, response);

    // prepend our extra descriptor fields (to optionally passed in values)
    extra = _.merge({
      __type: (sourceType === '01-podcasts') ? 'podcast' : 'episode',
      __sourceType: sourceType,
      __user: self.user,
      __stamp: self.stamp
    }, extra || {});

    // prepend extra descriptor fiels to each item
    return _.map(items, function(item) {
      return _.merge({}, extra, item);
    });
  };
}

PocketAPI.prototype.podcasts = function() {
  var self = this;
  return function() {
    return self._fetch(paths.podcasts_all).then(normalize('01-podcasts', self));
  };
};

PocketAPI.prototype.new_releases = function() {
  var self = this;
  return function() {
    return self._fetch(paths.new_releases_episodes).then(normalize('03-new_releases', self));
  }
};
PocketAPI.prototype.in_progress = function() {
  var self = this;
  return function() {
    return self._fetch(paths.in_progress_episodes).then(normalize('04-in_progress', self));
  }
};
PocketAPI.prototype.podcastPage = function(params) {
  if (!params.uuid) {
    throw new Error('podcastPage::missing podcast uuid');
  }
  if (!params.page) { // starts at page 1
    throw new Error('podcastPage::missing podcast page');
  }
  var self = this;
  return function() {
    return self._fetch(paths.find_by_podcast, params).then(normalize('02-podcasts', self, {
      podcast_uuid: params.uuid
    }));
  }
};

// not a function factory actually invokes login.
PocketAPI.prototype.sign_in = function(credentials) {
  // Login process:
  // GET /users/sign_in, to get cookies (XSRF-TOKEN)
  // POST form to /users/sign_in, with authenticity_token and credentials
  //  Note: the POST returns a 302, which rejects the promise, 
  //  whereas a faled login returns the login page content again (200)
  //  the 302 response also has a new XSRF-TOKEN cookie
  var self = this;
  return rp(self.session.reqGen(paths.sign_in, {
      resolveWithFullResponse: true
    }))
    .then(function(response) {
      var form = _.merge({
        authenticity_token: self.session.XSRF()
      }, credentials);

      // now do a form post for login, expect a 302, which is not followed for POST.        
      // unless followAllRedirects: true, but that only follows back to / and causes an extra fetch
      return new Promise(function(resolve, reject) {
        rp(self.session.reqGenXSRF(paths.sign_in, {
          form: form
        })).then(function(response) {
          console.log('response OK, expecting 302, reject.', response);
          reject('Login NOT OK');
        }).catch(function(error) { // error: {error:,options,response,statusCode}
          if (error.statusCode === 302 && error.response.headers.location === self.session.baseURI + '/') {
            console.log('Login OK: Got expected redirection: 302');
            self.user = credentials.name;
            resolve(true);
          } else {
            console.log('Got unexpected ERROR, reject.', error);
            self.user = null;
            reject(error);
          }
        });
      });
    })
};

// Exported API
var exports = module.exports = PocketAPI;