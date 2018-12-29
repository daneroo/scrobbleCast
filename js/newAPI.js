'use strict'

// This is meant to exercise the fetch API
// Can use it to test under request error conditions

// dependencies - core-public-internal
const os = require('os')
const rp = require('request-promise')
const PocketAPI = require('./lib/pocketAPIv2')
const utils = require('./lib/utils')

const log = require('./lib/log')
// var tasks = require('./lib/tasks');

const allCredentials = require('./credentials.json')
const baseURI = 'https://api.pocketcasts.com'
const cacheURI = 'https://cache.pocketcasts.com'

main()

async function main () {
  if (!samples()) return // just touch it !!!

  const iterations = 1
  const intervalMS = 2000

  for (let i = 0; i < iterations; i++) {
    log.info('Scrape Smoke Test', {
      iteration: i,
      host: os.hostname()
    })
    await iteration()
    await delay(intervalMS)
    console.log('- Done iteration')
  }
}

async function iteration () {
  for (let credentials of allCredentials.slice(-1)) {
    await tryemall(credentials)
  }
  log.info('Done all')
}

async function delay (ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function tryemall (credentials) {
  log.info('Start', credentials.name)

  // Use apiSession
  const apiSession = new PocketAPI({
    stamp: utils.stamp('10minutes')
  })

  // const token = .. if you want to keep the token
  await apiSession.login(credentials)

  const oneOfEach = {}
  // const podcasts = await getPodcasts(token)
  const podcasts = await apiSession.podcasts()
  log.info('  01-podcasts', podcasts.length)
  oneOfEach['01-podcasts'] = podcasts[0]

  for (const podcast of podcasts.slice(-1)) {
    const {uuid, title} = podcast
    const episodes = await apiSession.episodes(uuid)
    log.info('  02-episodes', episodes.length, {uuid, title})
    oneOfEach['02-podcasts'] = episodes[0]
    // await delay(500)
  }

  // // new_releases function factory - so invoke
  // const newReleases = await getNewReleases(token)
  const newReleases = await apiSession.newReleases()
  log.info('  03-new_releases', newReleases.length)
  // console.log(JSON.stringify(newReleases, null, 2))
  oneOfEach['03-new_releases'] = newReleases[0]

  // // in_progress function factory - so invoke
  // const inProgress = await getInProgress(token)
  const inProgress = await apiSession.inProgress()
  log.info('  04-in_progress', inProgress.length)
  // console.log(JSON.stringify(inProgress, null, 2))
  oneOfEach['04-in_progress'] = inProgress[0]

  console.log(JSON.stringify(oneOfEach, null, 2))
  log.info('Done', credentials.name)
}

async function getEpisodes (token, podcastuuid) {
  // podcastuuid = '70d13d50-9efe-0130-1b90-723c91aeae46'
  const response = await rp({
    method: 'POST',
    uri: `${baseURI}/user/podcast/episodes`,
    headers: {
      authorization: `Bearer ${token.token}`
    },
    body: {
      uuid: podcastuuid
    },
    json: true // Automatically stringifies the body to JSON
  })

  // https://cache.pocketcasts.com/podcast/full/70d13d50-9efe-0130-1b90-723c91aeae46/0/3/1000
  const full = await rp({
    method: 'GET',
    uri: `${cacheURI}/podcast/full//${podcastuuid}/0/3/1000`,
    headers: {
      authorization: `Bearer ${token.token}`
    },
    json: true // Automatically stringifies the body to JSON
  })

  const episodes = []

  // log.debug('found', {
  //   ep: response.episodes.length,
  //   full: full.podcast.episodes ? full.podcast.episodes.length : -1,
  //   episode_count: full.episode_count,
  //   title: full.podcast.title
  // })
  // if (!full.podcast.episodes) {
  //   console.log(JSON.stringify({full, response}, null, 2))
  // }
  // moved to static: url,title,published was published_at,duration,file_type,file_size was size
  // duration is copied from static, as it is alway 0 in episode itself
  // I will use the new names: published was published_at, file_size was size
  const staticProps = ['url', 'title', 'published', 'duration', 'file_type', 'file_size']
  let notfound = 0
  for (const episode of response.episodes) {
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
    log.warn(' notfound', {notfound, ep: response.episodes.length, full: full.podcast.episodes.length, episode_count: full.episode_count, title: full.podcast.title})
  }
  return episodes
}

function samples () {
  return {
    old_podcast: {
      '__type': 'podcast',
      '__sourceType': '01-podcasts',
      '__user': 'daniel',
      '__stamp': '2018-12-10T23:10:00Z',
      'id': 171028,
      'uuid': '0fb72d80-4c95-0130-e3d5-723c91aeae46',
      'url': 'http://www.tytnetwork.com',
      'title': 'The Young Turks',
      'description': 'The Young Turks is Home of The Progressives. Cenk Uygur, Ana Kasparian and a host of progressive voices deliver the news and provocative commentary. Whether you are seeking a breakdown of current events, politics and the mainstream media or just a quick laugh, the Daily TYT Audio Podcast will always keep you informed and entertained. Catch the live show Monday through Friday, on www.tyt.com.',
      'thumbnail_url': 'https://static.megaphone.fm/podcasts/9c7cc30e-2790-11e8-bc29-8b399d51e042/image/uploads_2F1532123843070-1qqaxweq57x-36abb7ef88c46111da8987df0c48dd9c_2FTA_Branding_3000x3000.jpg',
      'author': 'TYT Network',
      'episodes_sort_order': 3
    },
    // missing in new: id
    // extra in new:  episodesSortOrder, autoStartFrom, lastEpisodePublished, unplayed, lastEpisodeUuid, lastEpisodePlayingStatus, lastEpisodeArchived
    new_podcast: {
      'uuid': '002e29f0-dc34-0132-080d-059c869cc4eb',
      'episodesSortOrder': 3,
      'autoStartFrom': 0,
      'title': 'Slack Variety Pack',
      'author': 'Slack',
      'description': "Slack Variety Pack is a podcast about work, and the people and teams who do amazing work together. In every episode, you'll find a glorious mix of stories on work culture, team work, innovation in the workplace, and our modern society. Contently calls it “the World’s Most Ambitious Branded Podcast”.",
      'url': 'https://slack.com/varietypack',
      'lastEpisodePublished': '2016-10-05T14:49:00Z',
      'unplayed': true,
      'lastEpisodeUuid': '777dba80-8f1f-0134-90a4-3327a14bcdba',
      'lastEpisodePlayingStatus': 1,
      'lastEpisodeArchived': false
    },
    old_episode: {
      '__type': 'episode',
      '__sourceType': '02-podcasts',
      '__user': 'daniel',
      '__stamp': '2018-12-19T03:10:00Z',
      'podcast_uuid': '2cfd8eb0-58b1-012f-101d-525400c11844',
      'id': null,
      'uuid': '85643063-0454-4284-93cb-39ed6d298019',
      'url': 'http://datastori.es/podlove/file/5522/s/feed/c/podcast/datastories-133.m4a',
      'title': 'Year Review 2018',
      'published_at': '2018-12-19 02:00:26',
      'duration': '6015',
      'file_type': 'audio/x-m4a',
      'size': 74818999,
      'playing_status': 0,
      'played_up_to': 0,
      'is_deleted': 0,
      'starred': 0,
      'is_video': false
    },
    // missing in new:  id, is_video
    // moved to static: url,title,published was published_at,duration,file_type,file_size was size
    // renamed playing_status, played_up_to, is_deleted, starred
    // always 0 in new: duration, get from static
    new_episode: {
      'uuid': 'f6a56400-5956-0132-d4a5-5f4c86fd3263',
      'playingStatus': 3,
      'playedUpTo': 0,
      'isDeleted': false,
      'starred': true,
      'duration': 0
    },
    new_static: {// cache://
      'episode_frequency': 'Weekly',
      'estimated_next_episode_at': '2019-01-01T11:00:00Z',
      'has_seasons': false,
      'season_count': 0,
      'episode_count': 43,
      'has_more_episodes': false,
      'podcast': {
        'url': 'https://devchat.tv/react-round-up',
        'title': 'React Round Up',
        'author': 'Devchat.tv',
        'description': 'A weekly discussion among React developers',
        'category': 'Technology\nSoftware How-To\nTechnology\nTech News\nBusiness\nCareers',
        'audio': true,
        'show_type': null,
        'uuid': 'fa8886b0-03cc-0136-c264-7d73a919276a',
        'episodes': [{
          'uuid': '26c6475b-0b5c-4dd6-8d38-ed42a5f1a571',
          'title': 'RRU 043: Testing React Apps Without Testing Implementation Details with Kent C. Dodds',
          'url': 'https://media.devchat.tv/reactroundup/RRU_043_Testing_React_Apps_without_Testing_Implementation_Details_with_Kent_C_Dodds.mp3',
          'file_type': 'audio/mp3',
          'file_size': 75921430,
          'duration': 4555,
          'published': '2018-12-25T11:00:00Z',
          'type': 'full'
        }, {
          'uuid': '6a73fef7-9c00-4327-9682-3239dcc87a73',
          'title': 'RRU 042: React at Product Hunt with Radoslav Stankov',
          'url': 'https://media.devchat.tv/reactroundup/RRU_042_React_at_Product_Hunt_with_Radoslav_Stankov.mp3',
          'file_type': 'audio/mp3',
          'file_size': 61128355,
          'duration': 3631,
          'published': '2018-12-18T11:00:00Z',
          'type': 'full'
        }]
      }
    }
  }
}
