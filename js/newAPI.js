'use strict'

// This is meant to exercise the fetch API
// Can use it to test under request error conditions

// dependencies - core-public-internal
var os = require('os')
const rp = require('request-promise')

var log = require('./lib/log')
// var tasks = require('./lib/tasks');

const allCredentials = require('./credentials.json')
const baseURI = 'https://api.pocketcasts.com'

main()

async function main () {
  const iterations = 1
  const intervalMS = 2000

  for (let i = 0; i < iterations; i++) {
    log.info('Scrape Smoke Test', {
      iteration: i,
      host: os.hostname()
    })
    await iteration()
    await delay(intervalMS)
    console.log('-')
  }
}

async function iteration () {
  for (let credentials of allCredentials) {
    await tryemall(credentials)
  }
  log.info('Done all')
}

async function delay (ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function tryemall (credentials) {
  log.info('Start', credentials.name)

  const token = await login(credentials)

  const podcasts = await getPodcasts(token)
  // log.info({podcasts})
  log.info('  01-podcasts', podcasts.podcasts.length)

  // Spark from CBC Radio  05ccf3c0-1b97-012e-00b7-00163e1b201c
  // uuid: '05ccf3c0-1b97-012e-00b7-00163e1b201c'
  // TNT
  // uuid: '77170eb0-0257-012e-f994-00163e1b201c'
  // Wachtel on the Arts from CBC Radio's Ideas
  // uuid:'89beea90-5edf-012e-25b7-00163e1b201c'
  const episodes = await getEpisodes(token, '05ccf3c0-1b97-012e-00b7-00163e1b201c')
  // log.info(JSON.stringify({episodes}, null, 2))
  // log.info('  02-podcasts', podcasts.podcasts.length)

  // // new_releases function factory - so invoke
  // const newReleases = await apiSession.new_releases()()
  // log.info('  03-new_releases', newReleases.length)

  // // in_progress function factory - so invoke
  // const inProgress = await apiSession.in_progress()()
  // log.info('  04-in_progress', inProgress.length)

  log.info('Done', credentials.name)
}

async function login (credentials) {
  log.info('login', {credentials})
  const response = await rp({
    method: 'POST',
    uri: `${baseURI}/user/login`,
    body: {
      email: credentials['user[email]'],
      password: credentials['user[password]'],
      scope: 'webplayer'
    },
    json: true // Automatically stringifies the body to JSON
  })
  // log.info({response})
  return response
}

async function getPodcasts (token) {
  log.info('getPodcasts', {token})
  const response = await rp({
    method: 'POST',
    uri: `${baseURI}/user/podcast/list`,
    headers: {
      authorization: `Bearer ${token.token}`
    },
    body: {
      v: 1
    },
    json: true // Automatically stringifies the body to JSON
  })
  // log.info({response})
  return response
}

async function getEpisodes (token, podcastuuid) {
  log.info('getEpisodes', {token})
  const response = await rp({
    method: 'POST',
    uri: `${baseURI}/user/podcast/list`,
    headers: {
      authorization: `Bearer ${token.token}`
    },
    body: {
      uuid: podcastuuid
    },
    json: true // Automatically stringifies the body to JSON
  })
  log.info({response})
  return response
}

// fetch('https://api.pocketcasts.com/user/podcast/episodes', {
//   'credentials': 'include',
//   'headers': {'accept': '*/*',
//     'accept-language': 'en-US,en;q=0.9,fr;q=0.8',
//     'authorization': 'Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJiMDFkZjNhNi0xMjMxLTQyZWEtODQzNy03MGQyYWUwMGJmMjIiLCJpc3MiOiJodHRwczovL2FwaS5wb2NrZXRjYXN0cy5jb20iLCJzY29wZXMiOlsid2VicGxheWVyIl0sImV4cCI6MTU2MTQxOTAzMywianRpIjoiZWQ4MDhhMzctOTljNy00YzMwLTkzNWItZjQ3Yzg4NDAyZDlhIn0.5ODgxd95liOsE4QFgAiq5_Cy9As78rd3Xzh7-PGfCRU',
//     'cache-control': 'no-cache',
//     'content-type': 'application/json',
//     'pragma': 'no-cache'
//   },
//   'referrer': 'https://play.pocketcasts.com/web/podcasts/b9111820-79bb-0132-e4d9-5f4c86fd3263',
//   'referrerPolicy': 'no-referrer-when-downgrade',
//   'body': '{"uuid":"b9111820-79bb-0132-e4d9-5f4c86fd3263"}',
//   'method': 'POST',
//   'mode': 'cors'
// })
