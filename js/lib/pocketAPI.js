'use strict';

// dependencies - core-public-internal

var Promise = require('bluebird');
var _ = require('lodash');
var RateLimiter = require('limiter').RateLimiter;

// We wrapped rp (request-promise)
// - in order to encapsulate logging, error handling and eventually retry behavior
// var rp = require('request-promise');
var retry = require('./retry');
var Session = require('./session');
var log = require('./log');
var utils = require('./utils');

// globals limiter might be configured, injected, credentials as well...
// var limiter = new RateLimiter(20, 1000);
var limiter = new RateLimiter(5, 1000);
// var limiter = new RateLimiter(1, 1000);

function PocketAPI(options) {
  this.session = new Session();
  this.user = null; // set by sign_in
  // maybe default stamp should be time of fetch not time of session init...
  this.stamp = (options && options.stamp) ? options.stamp : utils.stamp('minute');
  log.verbose('PocketAPI:Injecting stamp', {
    stamp: this.stamp
  });

}

// the actual endpoints
var paths = {
  sign_in: '/users/sign_in',
  web: '/web',
  podcasts_all: '/web/podcasts/all.json',
  new_releases_episodes: '/web/episodes/new_releases_episodes.json',
  in_progress_episodes: '/web/episodes/in_progress_episodes.json',
  find_by_podcast: '/web/episodes/find_by_podcast.json'
};

// JSON post with param (requires prior login)
PocketAPI.prototype._fetch = function (path, params) {
  var self = this;
  var verbose = false;
  if (verbose && params && params.page) {
    log.debug('fetching', {
      page: params.page
    });
  }
  return speedLimit()
    .then(function () {
      return retry(self.session.reqJSON(path, params))
        .then(function (response) {
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
  return new Promise(function (resolve /*, reject */) {
    // console.log(new Date().toJSON().substr(0, 19), 'YELLOW');
    limiter.removeTokens(1, function () {
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
// -inject __page,__totalPages if sourceType==02-podcasts
function normalize(sourceType, self, extra) {
  return function (response) {
    var items = extractMember(sourceType, response);

    // inject __totalPages
    if (sourceType === '02-podcasts') {
      var perPage = 12;
      extra.__totalPages = Math.ceil(response.result.total / perPage);
    }
    // prepend our extra descriptor fields (to optionally passed in values)
    extra = _.merge({
      __type: (sourceType === '01-podcasts') ? 'podcast' : 'episode',
      __sourceType: sourceType,
      __user: self.user,
      __stamp: self.stamp
    }, extra || {});

    // prepend extra descriptor fiels to each item
    return _.map(items, function (item) {
      return _.merge({}, extra, item);
    });
  };
}

PocketAPI.prototype.podcasts = function () {
  var self = this;
  return function () {
    return self._fetch(paths.podcasts_all).then(normalize('01-podcasts', self));
  };
};

PocketAPI.prototype.new_releases = function () {
  var self = this;
  return function () {
    return self._fetch(paths.new_releases_episodes).then(normalize('03-new_releases', self));
  };
};
PocketAPI.prototype.in_progress = function () {
  var self = this;
  return function () {
    return self._fetch(paths.in_progress_episodes).then(normalize('04-in_progress', self));
  };
};
PocketAPI.prototype.podcastPage = function (params) {
  var self = this;
  if (!params.uuid) {
    throw new Error('podcastPage::missing podcast uuid');
  }
  if (!params.page) { // starts at page 1
    throw new Error('podcastPage::missing podcast page');
  }
  return function () {
    return self._fetch(paths.find_by_podcast, params).then(normalize('02-podcasts', self, {
      podcast_uuid: params.uuid,
      __page: params.page
    }));
  };
};

// fetch first or all pages, (or max pages)
// params.uuid: podcast_uuid
// params.maxPage: optional (all)
PocketAPI.prototype.podcastPages = function (params) {
  var self = this;
  if (!params.uuid) {
    throw new Error('podcastPage::missing podcast uuid');
  }

  // utility function (wrap and invoke)
  function fetchPage(page) {
    return self.podcastPage({
      uuid: params.uuid,
      page: page
    })()
      .then(function (result) {
        // console.log('|fetchPage-%d|: %d', page, result.length);
        return result;
      });
  }

  function cleanup(items) {
    // remove the __page and __totalPages attributes, now that we are done
    items.forEach(function (item) {
      delete item.__page;
      delete item.__totalPages;
    });
    return items;
  }

  return function () {
    var allItems = [];
    return fetchPage(1).then(function (result) {

      // turns out this is possible...
      if (result.length === 0) {
        return result;
      }
      if (!result[0].__totalPages) {
        throw new Error('podcastPages::missing total pages in result');
      }

      var totalPages = result[0].__totalPages;
      allItems = result;

      if (totalPages === 1 || params.maxPage === 1) {
        return cleanup(allItems);
      }

      if (params.maxPage) {
        totalPages = Math.min(totalPages, params.maxPage);
      }
      log.debug('Fetching', {
        pages: [2, totalPages]
      });

      // otherwise append the other pages
      // [2..totalPages]
      var restOfPages = _.times(totalPages - 1, function (page) {
        return page + 2;
      });

      return Promise.map(restOfPages, fetchPage, {
        concurrency: 2
      })
        .then(function (pages) {
          // pages is an array of results: flatten and concat.
          allItems = allItems.concat(_.flatten(pages));
          return cleanup(allItems);
        });

    });
  };
};

// not a function factory actually invokes login.
PocketAPI.prototype.sign_in = function (credentials) {
  // Login process:
  // GET /users/sign_in, to get cookies (XSRF-TOKEN)
  // POST form to /users/sign_in, with authenticity_token and credentials
  //  Note: the POST returns a 302, which rejects the promise,
  //  whereas a faled login returns the login page content again (200)
  //  the 302 response also has a new XSRF-TOKEN cookie
  var self = this;
  return retry(self.session.reqGen(paths.sign_in, {
    resolveWithFullResponse: true
  }))
    .then(function (/*response*/) {
      var form = _.merge({
        authenticity_token: self.session.XSRF()
      }, credentials);

      // now do a form post for login, expect a 302, which is not followed for POST.
      // unless followAllRedirects: true, but that only follows back to / and causes an extra fetch
      return new Promise(function (resolve, reject) {
        retry(self.session.reqGenXSRF(paths.sign_in, {
          form: form
        })).then(function (response) {
          console.log('response OK, expecting 302, reject.', response);
          reject('Login NOT OK');
        }).catch(function (error) { // error: {error:,options,response,statusCode}
          if (error.statusCode === 302 && error.response.headers.location === self.session.baseURI + '/') {
            // console.log('Login OK: Got expected redirection: 302');
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
    .then(function () {
      return retry(self.session.reqGen(paths.web, {
        resolveWithFullResponse: true
      }));
    });
};

// Exported API
exports = module.exports = PocketAPI;
