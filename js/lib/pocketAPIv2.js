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

PocketAPI.prototype.podcasts = async function () {
  const response = await this._fetch(paths.podcasts, { v: 1 })
  if (!response || !response.podcasts) {
    throw new Error('Unexpected or malformed response')
  }
  const podcasts = response.podcasts

  // adapt for v1 compat
  const renameFields = {
    episodesSortOrder: 'episodes_sort_order',
    autoStartFrom: null,
    lastEpisodePublished: null,
    unplayed: null,
    lastEpisodeUuid: null,
    lastEpisodePlayingStatus: null,
    lastEpisodeArchived: null
  }

  // TODO(daneroo): still missing : id, thumbnail_url
  renameOrRemoveFields(podcasts, renameFields)

  return this.normalize(podcasts, '01-podcasts')
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

  // Decorate: May not return all episodes...
  const episodes = await this.decorateEpisodes(uuid, response.episodes)

  const renameFields = {
    // from static cache
    published: 'published_at',
    file_size: 'size',
    //  from new service
    playingStatus: 'playing_status',
    playedUpTo: 'played_up_to',
    isDeleted: 'is_deleted'
  }
  // TODO(daneroo): still missing : id
  renameOrRemoveFields(episodes, renameFields)

  return this.normalize(episodes, '02-podcasts', {
    podcast_uuid: uuid
  })
}

// Add missing properties, *in place* in the Object array
PocketAPI.prototype.decorateEpisodes = async function (uuid, incomingEpisodes) {
  // https://cache.pocketcasts.com/podcast/full/70d13d50-9efe-0130-1b90-723c91aeae46/0/3/1000
  const full = await rp({
    method: 'GET',
    uri: `${cacheURI}/podcast/full//${uuid}/0/3/1000`,
    headers: {
      authorization: `Bearer ${this.token}`
    },
    json: true
  })

  // The returned array
  const episodes = []

  // moved to static: url,title,published was published_at,duration,file_type,file_size was size
  // duration is copied from static, as it is alway 0 in episode itself
  const staticProps = ['url', 'title', 'published', 'duration', 'file_type', 'file_size']
  let notfound = 0
  for (const episode of incomingEpisodes) {
    let found = false
    for (const fullEpisode of full.podcast.episodes) {
      if (fullEpisode.uuid === episode.uuid) {
        found = true
        // log.info('  -- found', {uuid: episode.uuid, title: fullEpisode.title})
        // be defensive:
        for (const prop of staticProps) {
          if (prop in fullEpisode) {
            episode[prop] = fullEpisode[prop]
          } else {
            log.warn('  -- could not set prop', {prop, uuid: episode.uuid})
          }
        }
        // break
      }
    }
    if (found) {
      episodes.push(episode)
    } else {
      notfound++
      // log.warn('  -- could not find episode', {uuid: episode.uuid, podcastuuid})
    }
  }
  if (notfound > 0) {
    log.warn('decorate episodes', {returning: episodes.length, notfound, incomingEpisodes: incomingEpisodes.length, full: full.podcast.episodes.length, title: full.podcast.title})
  }
  return episodes
}

PocketAPI.prototype.newReleases = async function () {
  const response = await this._fetch(paths.new_releases, { })
  if (!response || !response.episodes) {
    throw new Error('Unexpected or malformed response')
  }
  const episodes = response.episodes
  const renameFields = {
    podcastUuid: 'podcast_uuid',
    published: 'published_at',
    fileType: 'file_type',
    // were not present before, but should use old names
    playingStatus: 'playing_status',
    playedUpTo: 'played_up_to',
    isDeleted: 'is_deleted',
    // remove
    podcastTitle: null,
    episodeType: null,
    episodeSeason: null,
    episodeNumber: null
  }
  // TODO(daneroo): still missing : id, podcast_id
  renameOrRemoveFields(episodes, renameFields)

  return this.normalize(episodes, '03-new_releases')
}

PocketAPI.prototype.inProgress = async function () {
  const response = await this._fetch(paths.in_progress, { })
  if (!response || !response.episodes) {
    throw new Error('Unexpected or malformed response')
  }
  const episodes = response.episodes
  const renameFields = {
    podcastUuid: 'podcast_uuid',
    published: 'published_at',
    fileType: 'file_type',
    playingStatus: 'playing_status',
    playedUpTo: 'played_up_to',
    isDeleted: 'is_deleted',
    // remove
    podcastTitle: null,
    episodeType: null,
    episodeSeason: null,
    episodeNumber: null
  }
  // TODO(daneroo): still missing : id
  renameOrRemoveFields(episodes, renameFields)

  return this.normalize(episodes, '04-in_progress')
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

// removes and renames properties, *in place* in the Object array
// rename fields is map: oldName -> null|newName
function renameOrRemoveFields (items, renameFields) {
  for (const item of items) {
    for (const prop in renameFields) {
      if (prop in item) {
        // add the new field
        if (renameFields[prop]) {
          item[renameFields[prop]] = item[prop]
        }
        // remove the field
        delete item[prop]
      } else {
        console.log('prop not found', prop, JSON.stringify(item, null, 2))
      }
    }
  }
}

// Exported API
exports = module.exports = PocketAPI
