'use strict'

// dependencies - core-public-internal

var Promise = require('bluebird')
var _ = require('lodash')
var RateLimiter = require('limiter').RateLimiter

var retry = require('./retry')
var Session = require('./session')
var log = require('./log')
var utils = require('./utils')

// globals limiter might be configured, injected, credentials as well...
var limiter = new RateLimiter(5, 1000) // chosen
// var limiter = new RateLimiter(20, 1000)
// var limiter = new RateLimiter(1, 1000)

function PocketAPI (options) {
  this.session = new Session()
  this.user = null // set by sign_in
  // maybe default stamp should be time of fetch not time of session init...
  this.stamp = (options && options.stamp) ? options.stamp : utils.stamp('minute')
  log.verbose('PocketAPI:Injecting stamp', {
    stamp: this.stamp
  })
}

// the actual endpoints
var paths = {
  sign_in: '/users/sign_in',
  web: '/web',
  podcasts_all: '/web/podcasts/all.json',
  new_releases_episodes: '/web/episodes/new_releases_episodes.json',
  in_progress_episodes: '/web/episodes/in_progress_episodes.json',
  find_by_podcast: '/web/episodes/find_by_podcast.json'
}

// JSON post with param (requires prior login)
PocketAPI.prototype._fetch = async function (path, params) {
  const verbose = false
  if (verbose && params && params.page) {
    log.debug('fetching', { page: params.page })
  }
  await speedLimit()
  const response = await retry(this.session.reqJSON(path, params))
  if (verbose) {
    const meta = {path}
    if (response.episodes) {
      meta.episodes = response.episodes.length
    }
    if (response.podcasts) {
      meta.podcasts = response.podcasts.length
    }
    if (response.result && response.result.episodes) {
      meta.page = params.page
      meta.episodes = response.result.episodes.length
      meta.total = response.result.total
    }
    log.debug('_fetch', meta)
  }

  return response
}

// promise token.
function speedLimit (input) {
  return new Promise(function (resolve /*, reject */) {
    limiter.removeTokens(1, function () {
      return resolve(input)
    })
  })
}

function extractMember (sourceType, response) {
  if (sourceType === '01-podcasts') {
    // console.log('extract 01-podcasts');
    if (!response || !response.podcasts) {
      throw new Error('Unexpected or malformed response')
    }
    return response.podcasts
  }
  if (sourceType === '02-podcasts') {
    if (!response || !response.result || !response.result.episodes) {
      throw new Error('Unexpected or malformed response')
    }
    return response.result.episodes
  }
  if (sourceType === '03-new_releases' || sourceType === '04-in_progress') {
    if (!response || !response.episodes) {
      throw new Error('Unexpected or malformed response:' + sourceType)
    }
    return response.episodes
  }
}

// Use this function to normalize output
// -remove response top level member: {podcasts:[..]} => [..]
// -inject __type, __sourceType: 01-podcasts|02-podcasts|03-new_releases|04-in_progress
// -inject __user, __stamp (from (self==PocketAPI instance))
// -inject extra, e.g. {podcast_uuid}
function normalize (sourceType, self, extra) {
  return function (response) {
    const items = extractMember(sourceType, response)

    // prepend our extra descriptor fields (to optionally passed in values)
    extra = _.merge({
      __type: (sourceType === '01-podcasts') ? 'podcast' : 'episode',
      __sourceType: sourceType,
      __user: self.user,
      __stamp: self.stamp
    }, extra || {})

    // prepend extra descriptor fields to each item
    return items.map(function (item) {
      return {...extra, ...item}
    })
  }
}

PocketAPI.prototype.podcasts = function () {
  var self = this
  return function () {
    return self._fetch(paths.podcasts_all).then(normalize('01-podcasts', self))
  }
}

PocketAPI.prototype.new_releases = function () {
  var self = this
  return function () {
    return self._fetch(paths.new_releases_episodes).then(normalize('03-new_releases', self))
  }
}
PocketAPI.prototype.in_progress = function () {
  var self = this
  return function () {
    return self._fetch(paths.in_progress_episodes).then(normalize('04-in_progress', self))
  }
}

// fetch first or all pages, (or max pages)
// params.uuid: podcast_uuid
// params.maxPage: optional (<=0, default means allPages)
PocketAPI.prototype.podcastPages = function ({uuid, maxPage = 0}) {
  var self = this
  if (!uuid) {
    throw new Error('podcastPages::missing podcast uuid')
  }
  const maxPageSafety = 100 // prevent runaway paging 100 seems safe (10k episodes)
  if (maxPage <= 0 || maxPage > maxPageSafety) {
    maxPage = maxPageSafety // safety limit on number of pages
  }

  //  sould return {allItems,done}
  async function appendItems (prevItems, page) {
    const response = await self._fetch(paths.find_by_podcast, {
      uuid,
      page
    })
    const expectedItemCount = response.result.total

    const items = await (normalize('02-podcasts', self, {
      podcast_uuid: uuid
    })(response))
    // console.log('|fetchPage-%d|: %d of %d', page, items.length, expectedItemCount)

    // return items
    const allItems = prevItems.concat(items)

    // we are done when:
    // - a particular page returns no items
    // - we have reached the expected total
    const done = items.length === 0 || allItems.length >= expectedItemCount

    // console.log('|allItems|: added %d in %d (expected:%d done:%j)', items.length, allItems.length, expectedItemCount, done)
    return {allItems, done}
  }

  return async function () {
    let allItems = [] // holds concatenated pages of items
    let done = false
    for (let page = 1; /* page <= totalPages */; page++) {
      ({allItems, done} = await appendItems(allItems, page))
      if (done || page >= maxPage) { // >= because page numbering starts at 1
        break
      }
    }
    return allItems
  }
}

// not a function factory actually invokes login.
PocketAPI.prototype.sign_in = function (credentials) {
  // Login process:
  // GET /users/sign_in, to get cookies (XSRF-TOKEN)
  // POST form to /users/sign_in, with authenticity_token and credentials
  //  Note: the POST returns a 302, which rejects the promise,
  //  whereas a faled login returns the login page content again (200)
  //  the 302 response also has a new XSRF-TOKEN cookie
  var self = this
  return retry(self.session.reqGen(paths.sign_in, {
    resolveWithFullResponse: true
  }))
    .then(function (/* response */) {
      var form = _.merge({
        authenticity_token: self.session.XSRF()
      }, credentials)

      // now do a form post for login, expect a 302, which is not followed for POST.
      // unless followAllRedirects: true, but that only follows back to / and causes an extra fetch
      return new Promise(function (resolve, reject) {
        retry(self.session.reqGenXSRF(paths.sign_in, {
          form: form
        })).then(function (response) {
          console.log('response OK, expecting 302, reject.', response)
          reject(new Error('Login NOT OK'))
        }).catch(function (error) { // error: {error:,options,response,statusCode}
          if (error.statusCode === 302 && error.response.headers.location === self.session.baseURI + '/') {
            // console.log('Login OK: Got expected redirection: 302');
            self.user = credentials.name
            resolve(true)
          } else {
            console.log('Got unexpected ERROR, reject.', error)
            self.user = null
            reject(error)
          }
        })
      })
    })
    .then(function () {
      return retry(self.session.reqGen(paths.web, {
        resolveWithFullResponse: true
      }))
    })
}

// Exported API
exports = module.exports = PocketAPI
