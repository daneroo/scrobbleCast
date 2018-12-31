'use strict'

// Re-implementation of pocket API for v2
// dependencies - core-public-internal

var Promise = require('bluebird')
var RateLimiter = require('limiter').RateLimiter

var rp = require('request-promise')
var log = require('./log')
var utils = require('./utils')

// globals limiter might be configured, injected, credentials as well...
var limiter = new RateLimiter(5, 1000) // chosen
// var limiter = new RateLimiter(20, 1000)
// var limiter = new RateLimiter(1, 1000)

const baseURI = 'https://api.pocketcasts.com'
const cacheURI = 'https://cache.pocketcasts.com'
// the actual endpoints
const paths = {
  login: '/user/login', // MIGRATED
  // web: '/web',  // DEPRECATED, part of old sign_in
  podcasts: '/user/podcast/list', // MIGRATED
  new_releases: '/user/new_releases', // MIGRATED
  in_progress: '/user/in_progress', // MIGRATED
  episodes: '/user/podcast/episodes' // MIGRATED
}

function PocketAPI (options) {
  this.user = null // set by sign_in
  this.token = null // set by sign_in
  // maybe default stamp should be time of fetch not time of session init...
  this.stamp = (options && options.stamp) ? options.stamp : utils.stamp('minute')
  log.verbose('PocketAPI:Injecting stamp', {
    stamp: this.stamp
  })
}

// JSON post with param (requires prior login)
PocketAPI.prototype._fetch = async function (path, body = {}) {
  await speedLimit()
  // const response = await rp(this.session.reqJSON(path, params))
  const response = await rp({
    method: 'POST',
    uri: `${baseURI}${path}`,
    headers: {
      authorization: `Bearer ${this.token}`
    },
    body: body,
    json: true // Automatically stringifies the body to JSON
  })

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

// Use this function to normalize output
// -remove response top level member: {podcasts:[..]} => [..]
// -inject __type, __sourceType: 01-podcasts|02-podcasts|03-new_releases|04-in_progress
// -inject __user, __stamp (from (self==PocketAPI instance))
// -inject extra, e.g. {podcast_uuid}
PocketAPI.prototype.normalize = function (items, sourceType, extra = {}) {
  // prepend our extra descriptor fields (to optionally passed in values)
  extra = {
    __type: (sourceType === '01-podcasts') ? 'podcast' : 'episode',
    __sourceType: sourceType,
    __user: this.user,
    __stamp: this.stamp,
    ...extra
  }

  // prepend extra descriptor fields to each item
  return items.map(function (item) {
    return {...extra, ...item}
  })
}

// TODO(daneroo): normalize
PocketAPI.prototype.podcasts = async function () {
  const response = await this._fetch(paths.podcasts, { v: 1 })
  if (!response || !response.podcasts) {
    throw new Error('Unexpected or malformed response')
  }
  return this.normalize(response.podcasts, '01-podcasts')
}

// TODO(daneroo): decorate
PocketAPI.prototype.episodes = async function (uuid) {
  if (!uuid) {
    throw new Error('episodes::missing podcast uuid')
  }
  const response = await this._fetch(paths.episodes, { uuid })
  if (!response || !response.episodes) {
    throw new Error('Unexpected or malformed response')
  }
  return this.normalize(response.episodes, '02-podcasts', {
    podcast_uuid: uuid
  })
}

PocketAPI.prototype.newReleases = async function () {
  const response = await this._fetch(paths.new_releases, { })
  if (!response || !response.episodes) {
    throw new Error('Unexpected or malformed response')
  }
  return this.normalize(response.episodes, '03-new_releases')
}

PocketAPI.prototype.inProgress = async function () {
  const response = await this._fetch(paths.in_progress, { })
  if (!response || !response.episodes) {
    throw new Error('Unexpected or malformed response')
  }
  return this.normalize(response.episodes, '04-in_progress')
}

// TODO(daneroo): change credential fields to username,password
PocketAPI.prototype.login = async function (credentials) {
  const response = await this._fetch(paths.login, {
    email: credentials['user[email]'],
    password: credentials['user[password]'],
    scope: 'webplayer'
  })

  this.user = credentials.name
  this.token = response.token
  this.uuid = response.uuid
  return response
}

// Exported API
exports = module.exports = PocketAPI
