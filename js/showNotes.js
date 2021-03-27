'use strict'

// This is meant to fetch the show Notes
// - it writes files for ./data/stork/episodes
// - it fetches all show notes for all episode in all podcasts
// - all podcasts means: apiSession.podcasts() \union known podcasts
//  where knowPodcasts was extracted from podcast history on 2021-03-23
// but should be made dynamic, with connection to database

// dependencies - core-public-internal
// const tasks = require('./lib/tasks')
const { promises: fs } = require('fs')
const { join } = require('path')

const log = require('./lib/log')
const utils = require('./lib/utils')
const PocketAPI = require('./lib/pocketAPIv2')

const allCredentials = require('./credentials.json')
const dataDirectory = join(process.cwd(), 'data', 'stork') /// stork
// const podcastsDirectory = join(dataDirectory, 'podcasts')
const episodesDirectory = join(dataDirectory, 'episodes')

main()
async function main () {
  for (const credentials of allCredentials) {
    if (credentials.name !== 'daniel') {
      continue
    }
    await noteTask(credentials)
  }
  log.info('Done')
}

async function noteTask (credentials) {
  var start = +new Date()
  // lifecycle('notes', 'start', { user: credentials.name })

  const sums = {
    skipped: 0,
    written: 0,
    errors: 0,
    expected: 0
  }

  // this should be isolated/shared in Session: return by sign_in.
  var apiSession = new PocketAPI({
    stamp: utils.stamp('10minutes')
  })
  try {
    // const sums = {} // e.g. {items:3,inserted:1,deleted:2}
    await apiSession.login(credentials)
    // const podcasts = await apiSession.podcasts()
    const podcasts = knownPodcasts()
    // const podcasts = [{
    //   uuid: 'e704d9e0-9b5b-0133-2dcb-6dc413d6d41d',
    //   title: 'The Impact Podcast | Tech Trends for Entrepreneurs'
    // }]

    log.info('|podcasts|', podcasts.length)
    for (const podcast of podcasts) {
      const counts = await notesForPodcast(apiSession, podcast)
      sumCounts(sums, counts)
    }
    // lifecycle('notes', 'done', { user: apiSession.user, ...sums, elapsed: elapsedSince(start) })
  } catch (error) {
    log.error('tasks.notes:error:', error)
    // lifecycle('notes', 'done with error', { user: credentials.name })
  }
  const elapsed = ((+new Date() - start) / 1000).toFixed(2)
  log.info('Processed All', { ...sums, elapsed })
}

async function notesForPodcast (apiSession, podcast) {
  const start = +new Date()
  const counts = {
    skipped: 0,
    written: 0,
    errors: 0,
    expected: 0
  }
  const { uuid, title } = podcast
  log.info('Processing podcast', { uuid, title })
  const podcastFull = await apiSession.podcastFull(uuid)
  console.log('|podcastFull.episodes|', podcastFull.podcast.episodes.length)

  // const episodes = await apiSession.episodes(uuid)
  const episodes = await podcastFull.podcast.episodes
  // console.log('|episodes|', episodes.length)

  counts.expected += episodes.length

  for (const episode of episodes) {
    const { uuid, title } = episode
    const episodeFile = join(episodesDirectory, uuid + '.txt')
    try {
      const stat = await fs.stat(episodeFile)
      if (!stat.isFile()) {
        log.error('Episode file is present but is not a file')
        counts.errors += 1
        continue
      } else {
        // log.info('Skipped episode', { uuid, title, exists: true })
        counts.skipped += 1
      }
    } catch (err) {
      const notes = await apiSession.showNotes(uuid)
      episode.notes = notes
      await writeEpisode(apiSession, episode, episodeFile)
      counts.written += 1
      log.info('Wrote episode', { uuid, title })
    }
  }
  const elapsed = ((+new Date() - start) / 1000).toFixed(2)
  log.info('Processed podcast', { uuid, title, ...counts, elapsed })
  return counts
}

// extract the logic of testing wether the episode file already exists...
// async function episodeFileAndExists () {
//   return { path: '/path', exists: true }
// }

async function writeEpisode (apiSession, episode, episodeFile) {
  const { title, notes } = episode
  // log.info(JSON.stringify({ episode }, null, 2))
  await fs.mkdir(episodesDirectory, { recursive: true })
  // add meta for podcast and episode, at least uuids
  await fs.writeFile(episodeFile, `
  ${title}\n
  ${notes}\n  
`)
}

function sumCounts (sums, counts) {
  for (const key in counts) {
    sums[key] = sums[key] || 0
    sums[key] += counts[key]
  }
  return sums
}

function knownPodcasts () {
  /* spellchecker: disable */
  return [
    {
      uuid: '278554c0-0bef-012e-fb16-00163e1b201c',
      title: 'FLOSS Weekly (Audio)'
    },
    {
      uuid: '30c2cb40-0256-012e-f994-00163e1b201c',
      title: 'This Week in Tech (Audio)'
    },
    {
      uuid: '77170eb0-0257-012e-f994-00163e1b201c',
      title: 'Tech News Weekly (Audio)'
    },
    {
      uuid: 'dde6abe0-04fe-012e-f9d3-00163e1b201c',
      title: 'This Week in Google (Audio)'
    },
    {
      uuid: 'c8738fe0-64d5-0139-3409-0acc26574db2',
      title: 'Modern Finance'
    },
    {
      uuid: 'a8dd9280-e2c5-0137-b6d2-0acc26574db2',
      title: 'Scientifically...'
    },
    {
      uuid: '3740d4c0-c646-0135-9e60-5bb073f92b78',
      title: 'Zero Knowledge'
    },
    {
      uuid: '1fd83510-f1b9-0134-ec5e-4114446340cb',
      title: 'The Thoughtful Gamer Podcast'
    },
    {
      uuid: 'ac371bd0-094f-0134-9ce1-59d98c6b72b8',
      title: 'Revisionist History'
    },
    {
      uuid: '1af9d480-1f8f-0138-9fc4-0acc26574db2',
      title: 'The Supermassive Podcast'
    },
    {
      uuid: 'a15217a0-d40a-0134-ebcf-4114446340cb',
      title: 'Indie Hackers'
    },
    {
      uuid: 'd81fbcb0-0422-012e-f9a0-00163e1b201c',
      title: 'Freakonomics Radio'
    },
    {
      uuid: '9bf16950-1f95-0138-9fc2-0acc26574db2',
      title: 'The Solo Coder Podcast'
    },
    {
      uuid: '162e49d0-b251-0133-2e49-6dc413d6d41d',
      title: '3 Minutes with Kent'
    },
    {
      uuid: '566fbb40-6020-0131-740c-723c91aeae46',
      title: 'Epicenter - Learn about Crypto, Blockchain, Ethereum, Bitcoin and Distributed Technologies'
    },
    {
      uuid: 'c0313510-8262-0132-e7ff-5f4c86fd3263',
      title: 'Ask a Spaceman!'
    },
    {
      uuid: 'e0b82010-83df-012e-3c4d-00163e1b201c',
      title: 'Monday Morning Podcast'
    },
    {
      uuid: '467b49a0-c657-0138-e72e-0acc26574db2',
      title: 'Sway'
    },
    {
      uuid: '64a62690-dcdd-0134-ebdd-4114446340cb',
      title: 'JS Party: JavaScript & Web Dev'
    },
    {
      uuid: '489621e0-00c8-0134-9c92-59d98c6b72b8',
      title: 'Go Time'
    },
    {
      uuid: '731ee7a0-0721-0139-41a1-0acc26574db2',
      title: 'Ardan Labs Podcast'
    },
    {
      uuid: '53678a10-bc45-0134-10a8-25324e2a541d',
      title: 'Intercepted with Jeremy Scahill'
    },
    {
      uuid: '88849f30-39ce-012e-11bd-00163e1b201c',
      title: "Podcast – Cory Doctorow's craphound.com"
    },
    {
      uuid: '5d9323c0-0746-0139-41a1-0acc26574db2',
      title: "EFF's How to Fix the Internet"
    },
    {
      uuid: '70d13d50-9efe-0130-1b90-723c91aeae46',
      title: 'The Changelog: Software Dev & Open Source'
    },
    {
      uuid: '883da880-adda-0138-e6aa-0acc26574db2',
      title: 'The Tight Rope'
    },
    {
      uuid: '873e7420-042d-012e-f9a4-00163e1b201c',
      title: 'The Joe Rogan Experience'
    },
    {
      uuid: 'abdaa420-1dfb-012e-01d4-00163e1b201c',
      title: 'A Brief History of Mathematics'
    },
    {
      uuid: '67185830-fb63-0138-415c-0acc26574db2',
      title: 'FSJam Podcast'
    },
    {
      uuid: 'b045b920-a2cb-0133-2ddd-6dc413d6d41d',
      title: 'FiveThirtyEight Politics'
    },
    {
      uuid: 'fb0048c0-0123-0136-c264-7d73a919276a',
      title: 'Techmeme Ride Home'
    },
    {
      uuid: '97cfc710-dbe6-0138-e7a1-0acc26574db2',
      title: 'Epic React Podcast'
    },
    {
      uuid: 'f5b97290-0422-012e-f9a0-00163e1b201c',
      title: 'Radiolab'
    },
    {
      uuid: 'c3f4b2a0-d212-0138-e76c-0acc26574db2',
      title: 'Recall: How to Start a Revolution'
    },
    {
      uuid: 'ff914e00-4724-0137-f266-1d245fc5f9cf',
      title: 'Your Undivided Attention'
    },
    {
      uuid: 'ad06bcf0-c419-0136-7b94-27f978dac4db',
      title: 'A Podcast Of Unnecessary Detail'
    },
    {
      uuid: 'c4997a60-dea6-0137-b6c1-0acc26574db2',
      title: 'Smashing Podcast'
    },
    {
      uuid: '8fc91c30-03a7-0134-9c92-59d98c6b72b8',
      title: 'The TWIML AI Podcast (formerly This Week in Machine Learning & Artificial Intelligence)'
    },
    {
      uuid: 'f1434cd0-dbb9-0134-ebdd-4114446340cb',
      title: 'Datascape Podcast'
    },
    {
      uuid: '11994090-bc40-0137-b703-0acc26574db2',
      title: 'Classical Fix'
    },
    {
      uuid: '5bbc3e50-026e-0131-c9c5-723c91aeae46',
      title: 'Intelligence Squared'
    },
    {
      uuid: 'a53d8b10-d5ba-0134-ebdd-4114446340cb',
      title: 'Hidden Forces'
    },
    {
      uuid: '62e4f060-ec96-0133-9c5b-59d98c6b72b8',
      title: 'The InfoQ Podcast'
    },
    {
      uuid: 'cb83ab20-4b82-0138-9780-0acc26574db2',
      title: 'Electro Monkeys'
    },
    {
      uuid: '87eef2d0-cd12-0137-1e17-0acc26574db2',
      title: 'COMPLEXITY'
    },
    {
      uuid: 'b4d12f70-636c-0135-902c-63f4b61a9224',
      title: 'PodCTL - Enterprise Kubernetes'
    },
    {
      uuid: 'd22cc180-0dc1-012e-fbb9-00163e1b201c',
      title: 'The Reality Check'
    },
    {
      uuid: 'ec18bbd0-0426-012e-f9a0-00163e1b201c',
      title: 'Hanselminutes with Scott Hanselman'
    },
    {
      uuid: '05ccf3c0-1b97-012e-00b7-00163e1b201c',
      title: 'Spark from CBC Radio'
    },
    {
      uuid: '07298e20-6173-0136-4e65-69745d675bc7',
      title: '5 Minutes With An Astronomer'
    },
    {
      uuid: '07c07770-1727-012e-feea-00163e1b201c',
      title: 'Big Ideas (Audio)'
    },
    {
      uuid: '08b332e0-0eb0-0136-c264-7d73a919276a',
      title: 'HashiCast'
    },
    {
      uuid: '0cc43410-1d2f-012e-0175-00163e1b201c',
      title: '99% Invisible'
    },
    {
      uuid: '0fb72d80-4c95-0130-e3d5-723c91aeae46',
      title: 'The Young Turks'
    },
    {
      uuid: '10b7a790-84b9-0131-86c1-723c91aeae46',
      title: 'Talk Nerdy with Cara Santa Maria'
    },
    {
      uuid: '12634a60-79b5-0133-2d19-6dc413d6d41d',
      title: 'Starts With A Bang podcast'
    },
    {
      uuid: '148ba950-c186-0133-2e8b-6dc413d6d41d',
      title: 'The Kevin Rose Show'
    },
    {
      uuid: '14cd6d90-0cc4-012e-fb69-00163e1b201c',
      title: 'Entrepreneurial Thought Leaders'
    },
    {
      uuid: '17620ce0-77b4-0130-0031-723c91aeae46',
      title: 'GitMinutes'
    },
    {
      uuid: '189d1b50-5cdd-0136-4e65-69745d675bc7',
      title: 'The Debaters'
    },
    {
      uuid: '1a29a570-529f-0134-ec21-0d50f522381b',
      title: 'JAMstack Radio'
    },
    {
      uuid: '1d95f1c0-1ef4-0136-c266-7d73a919276a',
      title: 'Kubernetes Podcast from Google'
    },
    {
      uuid: '1dbc2230-2b82-012e-0915-00163e1b201c',
      title: 'DevOps Cafe Podcast'
    },
    {
      uuid: '20152cf0-7d63-0136-7b90-27f978dac4db',
      title: 'Talks at Google'
    },
    {
      uuid: '220196b0-5d6e-012e-2467-00163e1b201c',
      title: 'Singularity.FM'
    },
    {
      uuid: '24275870-2a57-0136-c266-7d73a919276a',
      title: 'The All New Dennis Miller Option'
    },
    {
      uuid: '2433b8f0-0d4c-012e-fb96-00163e1b201c',
      title: 'Real Time with Bill Maher'
    },
    {
      uuid: '25ca21a0-85c2-012e-3eb7-00163e1b201c',
      title: 'NodeUp'
    },
    {
      uuid: '262069e0-e7df-0132-0ef7-059c869cc4eb',
      title: 'Economist Radio'
    },
    {
      uuid: '2743d720-0edf-0133-2204-059c869cc4eb',
      title: 'Software Engineering Daily'
    },
    {
      uuid: '2c4cc500-9a0f-0137-4052-0acc26574db2',
      title: 'Chats with Kent C. Dodds'
    },
    {
      uuid: '2cfd8eb0-58b1-012f-101d-525400c11844',
      title: 'Data Stories'
    },
    {
      uuid: '30c3aff0-eed5-012e-e176-525400c11844',
      title: 'Physics World Stories Podcast'
    },
    {
      uuid: '31ae3230-2c09-012e-096b-00163e1b201c',
      title: 'Long Now: Seminars About Long-term Thinking'
    },
    {
      uuid: '359848b0-c0fe-0132-381c-0b39892d38e0',
      title: 'Conversations with Tyler'
    },
    {
      uuid: '3920d880-1b97-012e-00b9-00163e1b201c',
      title: 'Laugh Out Loud from CBC Radio'
    },
    {
      uuid: '3ec78c50-0d62-012e-fb9c-00163e1b201c',
      title: "Dan Carlin's Hardcore History"
    },
    {
      uuid: '40d36c30-5580-0131-828c-723c91aeae46',
      title: 'Functional Geekery'
    },
    {
      uuid: '42150f70-c66f-012f-7e7a-723c91aeae46',
      title: 'Mixed Mental Arts'
    },
    {
      uuid: '421c79d0-0423-012e-f9a0-00163e1b201c',
      title: 'Discovery'
    },
    {
      uuid: '44557c00-40b4-0131-77d4-723c91aeae46',
      title: 'Arrested DevOps'
    },
    {
      uuid: '489d0750-74d7-0137-f267-1d245fc5f9cf',
      title: 'The Origins Podcast with Lawrence Krauss'
    },
    {
      uuid: '4fa94560-79e8-0135-9036-63f4b61a9224',
      title: 'Physics (Audio)'
    },
    {
      uuid: '52905800-287d-012e-0725-00163e1b201c',
      title: 'Quirks and Quarks from CBC Radio'
    },
    {
      uuid: '52b13ce0-0d7b-012e-fba4-00163e1b201c',
      title: 'Science Friday'
    },
    {
      uuid: '55c51e50-3318-012e-0d51-00163e1b201c',
      title: 'Writers and Company from CBC Radio'
    },
    {
      uuid: '58b79440-1f1f-0131-6ebd-723c91aeae46',
      title: 'All JavaScript Podcasts by Devchat.tv'
    },
    {
      uuid: '5e0e0e70-0c4f-012e-fb35-00163e1b201c',
      title: 'Astronomy Cast'
    },
    {
      uuid: '5e27c480-3fcb-0133-be19-0d11918ab357',
      title: "Surely You're Joking"
    },
    {
      uuid: '5e6125f0-0424-012e-f9a0-00163e1b201c',
      title: 'In Our Time'
    },
    {
      uuid: '64a3ea50-b48e-0137-faec-0acc26574db2',
      title: 'The Daily Space'
    },
    {
      uuid: '650a7fd0-c449-0135-9e60-5bb073f92b78',
      title: "Dan Carlin's Hardcore History: Addendum"
    },
    {
      uuid: '66084f00-c6b1-0130-34d2-723c91aeae46',
      title: 'BBC Inside Science'
    },
    {
      uuid: '691963e0-4f63-0137-f266-1d245fc5f9cf',
      title: 'Advent of Computing'
    },
    {
      uuid: '6e4acf20-e6b2-0134-ec38-4114446340cb',
      title: 'Cosmic Vertigo'
    },
    {
      uuid: '74a35900-0423-012e-f9a0-00163e1b201c',
      title: 'Global News Podcast'
    },
    {
      uuid: '77734670-5fba-0133-ce2c-0d11918ab357',
      title: 'Google Cloud Platform Podcast'
    },
    {
      uuid: '781f3ec0-3d3b-0134-eba6-0d50f522381b',
      title: 'Request For Commits'
    },
    {
      uuid: '7b28dcf0-e564-012e-dda0-525400c11844',
      title: "NASACast: What's Up? Video Podcasts"
    },
    {
      uuid: '7d16cee0-1c1c-0133-28b1-059c869cc4eb',
      title: 'Spacepod'
    },
    {
      uuid: '821417c0-adea-0136-7b93-27f978dac4db',
      title: 'GraphQL Patterns'
    },
    {
      uuid: '837bf210-041f-012e-f99f-00163e1b201c',
      title: 'Comedy Central Stand-Up'
    },
    {
      uuid: '85f383f0-1e6a-012e-0210-00163e1b201c',
      title: 'Fareed Zakaria GPS'
    },
    {
      uuid: '8afe50a0-0427-012e-f9a0-00163e1b201c',
      title: 'The Java Posse'
    },
    {
      uuid: '8cb63a90-c70a-0136-7b94-27f978dac4db',
      title: 'The Numberphile Podcast'
    },
    {
      uuid: '8cf9f110-fdee-012e-e8c1-525400c11844',
      title: 'The Titanium Physicists Podcast'
    },
    {
      uuid: '8d728390-249c-0131-73be-723c91aeae46',
      title: 'Making Sense with Sam Harris'
    },
    {
      uuid: '958b1150-0429-012e-f9a0-00163e1b201c',
      title: 'The Infinite Monkey Cage'
    },
    {
      uuid: '96cc52a0-b25e-0133-2e49-6dc413d6d41d',
      title: 'The Curious Cases of Rutherford & Fry'
    },
    {
      uuid: '9b506b20-c78c-0133-2e8b-6dc413d6d41d',
      title: 'Soft Skills Engineering'
    },
    {
      uuid: '9c2dc2e0-a570-0135-9e26-5bb073f92b78',
      title: 'egghead.io developer chats'
    },
    {
      uuid: '9d6076d0-3bd2-0134-eba6-0d50f522381b',
      title: 'Dockercast'
    },
    {
      uuid: '9f51f2c0-8fbc-0130-1069-723c91aeae46',
      title: "The Let's Talk Bitcoin Network"
    },
    {
      uuid: '9f812390-d54c-0136-3249-08b04944ede4',
      title: 'Post Reports'
    },
    {
      uuid: 'a0d69a80-04e7-0132-a2c3-5f4c86fd3263',
      title: 'The Type Theory Podcast'
    },
    {
      uuid: 'a2de39a0-7660-0130-ffe2-723c91aeae46',
      title: 'Norm Macdonald Live'
    },
    {
      uuid: 'a4732ee0-a19b-0134-9123-3327a14bcdba',
      title: 'Spotlight'
    },
    {
      uuid: 'a56c9e00-5332-0132-d11f-5f4c86fd3263',
      title: "O'Reilly Data Show Podcast"
    },
    {
      uuid: 'a98ead50-f0fe-0132-1156-059c869cc4eb',
      title: 'Elixir Fountain'
    },
    {
      uuid: 'aeddb420-7217-0133-2cee-6dc413d6d41d',
      title: 'Amanpour'
    },
    {
      uuid: 'b1ccb690-fd97-0130-c6ee-723c91aeae46',
      title: 'Revolutions'
    },
    {
      uuid: 'b9111820-79bb-0132-e4d9-5f4c86fd3263',
      title: 'History of Philosophy Without Any Gaps'
    },
    {
      uuid: 'bc383e00-0425-012e-f9a0-00163e1b201c',
      title: 'Science Talk'
    },
    {
      uuid: 'c22cf980-b963-0134-10a8-25324e2a541d',
      title: 'Data Engineering Podcast'
    },
    {
      uuid: 'c3adff20-1b2f-012e-0081-00163e1b201c',
      title: 'Ideas'
    },
    {
      uuid: 'c7e63dc0-29ec-012e-07fc-00163e1b201c',
      title: 'Radio Astronomy'
    },
    {
      uuid: 'c84870c0-906a-012f-3312-525400c11844',
      title: 'The History of Byzantium'
    },
    {
      uuid: 'c91eec00-0423-012e-f9a0-00163e1b201c',
      title: 'Philosophy Bites'
    },
    {
      uuid: 'd450fed0-bf28-0133-2e7c-6dc413d6d41d',
      title: 'Go Gab'
    },
    {
      uuid: 'd7adf010-b50e-0133-2e57-6dc413d6d41d',
      title: 'IFTF Blockchain Futures Lab'
    },
    {
      uuid: 'd953d3a0-15ab-012f-f37c-525400c11844',
      title: "O'Reilly Radar Podcast - O'Reilly Media Podcast"
    },
    {
      uuid: 'da7c9640-eeb9-0137-b700-0acc26574db2',
      title: 'On The Metal'
    },
    {
      uuid: 'e4b6efd0-0424-012e-f9a0-00163e1b201c',
      title: 'The History of Rome'
    },
    {
      uuid: 'e4ff94b0-8686-0130-0b07-723c91aeae46',
      title: 'The Science Hour'
    },
    {
      uuid: 'e6e92380-2c46-012e-0984-00163e1b201c',
      title: 'NASACast: This Week @NASA Audio'
    },
    {
      uuid: 'e6eb8660-0425-012e-f9a0-00163e1b201c',
      title: 'The Naked Scientists Podcast'
    },
    {
      uuid: 'e7718760-c406-0136-7b94-27f978dac4db',
      title: 'Five Things (Audio) - Channel 9'
    },
    {
      uuid: 'eb7f8fa0-73d4-0135-9034-63f4b61a9224',
      title: 'Ologies with Alie Ward'
    },
    {
      uuid: 'ede41160-9eeb-012f-3e7d-525400c11844',
      title: 'StarTalk Radio'
    },
    {
      uuid: 'effb1f10-6067-0136-4e65-69745d675bc7',
      title: "Sean Carroll's Mindscape: Science, Society, Philosophy, Culture, Arts, and Ideas"
    },
    {
      uuid: 'f5413aa0-606d-0136-4e65-69745d675bc7',
      title: 'Practical AI: Machine Learning & Data Science'
    },
    {
      uuid: 'fa8886b0-03cc-0136-c264-7d73a919276a',
      title: 'React Round Up'
    },
    {
      uuid: 'fe30f8e0-3da9-0135-9028-63f4b61a9224',
      title: 'Syntax - Tasty Web Development Treats'
    },
    {
      uuid: 'ba457f00-7222-0134-78b4-4ffec63d9550',
      title: 'Changelog Master Feed'
    },
    {
      uuid: '841d16d0-df2d-0137-b6c5-0acc26574db2',
      title: 'All Systems Go'
    },
    {
      uuid: 'ae29ce10-3119-0136-fa7a-0fe84b59566d',
      title: 'Elixir Mix'
    },
    {
      uuid: 'b8f7ec30-cb40-0137-1e15-0acc26574db2',
      title: 'The Next Big Idea'
    },
    {
      uuid: '6737caa0-ba44-0136-7b93-27f978dac4db',
      title: 'On a Mission'
    },
    {
      uuid: '25304390-54f4-012f-0ee2-525400c11844',
      title: "Everyday Einstein's Quick and Dirty Tips for Making Sense of Science"
    },
    {
      uuid: '7ddc0670-46fc-0132-cadc-5f4c86fd3263',
      title: 'A Scientist Walks Into A Bar'
    },
    {
      uuid: '9483d940-86fd-0137-f541-17da1cd0d495',
      title: 'Rustacean Station'
    },
    {
      uuid: '53a17840-4606-0133-c14a-0d11918ab357',
      title: 'New Rustacean'
    },
    {
      uuid: 'c19dfea0-4791-0137-f266-1d245fc5f9cf',
      title: '13 Minutes to the Moon'
    },
    {
      uuid: 'f40e0f50-5b9b-0137-f266-1d245fc5f9cf',
      title: 'Solvable'
    },
    {
      uuid: '55cc5d60-da79-012e-da26-525400c11844',
      title: 'Exposing PseudoAstronomy'
    },
    {
      uuid: '6a452d60-2d0c-0137-f265-1d245fc5f9cf',
      title: 'weirdtrickmafia.fm'
    },
    {
      uuid: 'dc2ac100-3c51-0133-bc8e-0d11918ab357',
      title: 'The New Stack @ Scale'
    },
    {
      uuid: 'c3e66160-239d-0137-f265-1d245fc5f9cf',
      title: 'Against the Rules with Michael Lewis'
    },
    {
      uuid: '6d23f7b0-0969-0132-a5f9-5f4c86fd3263',
      title: 'The New Stack Analysts'
    },
    {
      uuid: '2645cf10-1b93-012e-00b7-00163e1b201c',
      title: 'Comedy Factory from CBC Radio'
    },
    {
      uuid: '36d15380-8bcf-0135-9038-63f4b61a9224',
      title: 'All Things Git'
    },
    {
      uuid: '18c8f860-d3c7-0135-9e60-5bb073f92b78',
      title: 'CoRecursive - Software Engineering Interviews'
    },
    {
      uuid: '24417630-148e-0134-a447-13e6b3913b15',
      title: 'Anatomy of Next'
    },
    {
      uuid: '976c2fc0-1c0e-012e-00fd-00163e1b201c',
      title: 'Android Central Podcast'
    },
    {
      uuid: 'd8d4ae20-58e7-0135-902c-63f4b61a9224',
      title: 'Rework'
    },
    {
      uuid: 'b4eb8a20-5ec6-012e-25a0-00163e1b201c',
      title: 'The Cloudcast - Weekly Cloud Computing Podcast'
    },
    {
      uuid: 'fe587e80-d48e-012e-7195-00163e1b201c',
      title: 'The Life Scientific'
    },
    {
      uuid: '56d400d0-242c-0133-b026-0d11918ab357',
      title: 'Packet Pushers - Datanauts'
    },
    {
      uuid: '4af9a900-9f4c-0130-1bc0-723c91aeae46',
      title: 'Ideas at the House'
    },
    {
      uuid: 'df86cd70-5e91-0133-cd9f-0d11918ab357',
      title: 'The Rubin Report'
    },
    {
      uuid: 'f56102e0-bc16-012f-5405-525400c11844',
      title: 'The Smartest Man in the World'
    },
    {
      uuid: 'd9124f40-5dbd-0135-902c-63f4b61a9224',
      title: 'DesignBetter.Co: Design great products'
    },
    {
      uuid: '8c556e80-113d-0134-a447-13e6b3913b15',
      title: 'The New Stack Context'
    },
    {
      uuid: 'b9f28130-8b53-0135-9038-63f4b61a9224',
      title: 'All Things Git'
    },
    {
      uuid: '18910720-189c-0132-b004-5f4c86fd3263',
      title: 'The New Stack Makers'
    },
    {
      uuid: '38d62b00-a930-012f-46a2-525400c11844',
      title: 'Harmontown'
    },
    {
      uuid: '4a544760-1e07-012e-01db-00163e1b201c',
      title: 'Science... sort of'
    },
    {
      uuid: '4d4b5680-1b1d-012e-0078-00163e1b201c',
      title: 'The Survival Podcast'
    },
    {
      uuid: 'f4f884f0-39d5-0133-baed-0d11918ab357',
      title: 'History on Fire'
    },
    {
      uuid: '4bd00c20-4feb-0134-ec0b-0d50f522381b',
      title: 'The Women in Tech Show'
    },
    {
      uuid: 'b0f7c190-9173-012f-33de-525400c11844',
      title: 'Packet Pushers - Priority Queue'
    },
    {
      uuid: '3a5adea0-a2e9-0134-9123-3327a14bcdba',
      title: 'Chalke Valley History Hit'
    },
    {
      uuid: '1efbcba0-7592-0132-e061-5f4c86fd3263',
      title: 'Talking Machines'
    },
    {
      uuid: 'e704d9e0-9b5b-0133-2dcb-6dc413d6d41d',
      title: 'The Impact Podcast | Tech Trends for Entrepreneurs'
    },
    {
      uuid: 'b633aa60-0bfe-012e-fb1f-00163e1b201c',
      title: 'World Update: Daily Commute'
    },
    {
      uuid: '002e29f0-dc34-0132-080d-059c869cc4eb',
      title: 'Slack Variety Pack'
    },
    {
      uuid: 'f1b73fd0-0aff-0131-cd15-723c91aeae46',
      title: 'Think!'
    },
    {
      uuid: '825e88b0-3282-0134-eba6-0d50f522381b',
      title: 'NASA in Silicon Valley'
    },
    {
      uuid: 'abb0ba60-2eac-0135-52f9-452518e2d253',
      title: 'Mapping The Journey'
    },
    {
      uuid: '5e8f59f0-e6c2-0134-ec38-4114446340cb',
      title: 'CaSE'
    },
    {
      uuid: '1eff0f70-a18e-0131-955f-723c91aeae46',
      title: 'You Must Remember This'
    },
    {
      uuid: '632c1e80-d414-0132-034c-059c869cc4eb',
      title: 'Myths and Legends'
    },
    {
      uuid: 'eedd5f90-b1b8-0130-2756-723c91aeae46',
      title: 'Philosophize This!'
    },
    {
      uuid: '1abbf4d0-25b5-012e-057d-00163e1b201c',
      title: 'Langsam gesprochene Nachrichten | Deutsch lernen | Deutsche Welle'
    },
    {
      uuid: 'de5c4480-29f1-012e-07fc-00163e1b201c',
      title: 'Inside Europe | Deutsche Welle'
    },
    {
      uuid: '27284b30-d9fa-0131-37b0-723c91aeae46',
      title: 'Data Skeptic'
    },
    {
      uuid: '13b91b40-06b2-0132-a441-5f4c86fd3263',
      title: 'You Are Not So Smart'
    },
    {
      uuid: '80931490-01be-0132-a0fb-5f4c86fd3263',
      title: 'All Angular Podcasts by Devchat.tv'
    },
    {
      uuid: 'a6cebae0-ef04-012f-9d6a-723c91aeae46',
      title: 'Very Bad Wizards'
    },
    {
      uuid: '32923e10-fac6-0132-17f2-059c869cc4eb',
      title: '#WeThePeople LIVE'
    },
    {
      uuid: '71689990-cba3-0133-2e8b-6dc413d6d41d',
      title: 'STEM-Talk'
    },
    {
      uuid: '9e8c12f0-220b-0133-246e-059c869cc4eb',
      title: 'Detective'
    },
    {
      uuid: '5cda9490-4117-012e-1622-00163e1b201c',
      title: 'The Vergecast'
    },
    {
      uuid: '0f752d70-042a-012e-f9a0-00163e1b201c',
      title: 'Science Weekly'
    },
    {
      uuid: '01a33f10-fcfe-0132-18b7-059c869cc4eb',
      title: 'Recode Decode, hosted by Kara Swisher'
    },
    {
      uuid: '23b920c0-da64-0133-2e9f-6dc413d6d41d',
      title: 'Mostly Node'
    },
    {
      uuid: '31e13b40-dd4c-0131-3a26-723c91aeae46',
      title: 'Meet the Composer'
    },
    {
      uuid: 'cca9b1e0-87d3-0130-0bdb-723c91aeae46',
      title: 'The Audacity to Podcast - how to launch and improve your podcast'
    },
    {
      uuid: '7b8e1bd0-5afd-0131-8cef-723c91aeae46',
      title: 'Tech News Today (MP3)'
    },
    {
      uuid: '8c4c6bd0-a696-012f-4480-525400c11844',
      title: 'No Agenda'
    },
    {
      uuid: 'fe2b3f90-0422-012e-f9a0-00163e1b201c',
      title: 'The Economist Radio (All audio)'
    },
    {
      uuid: '3782b780-0bc5-012e-fb02-00163e1b201c',
      title: 'This American Life'
    },
    {
      uuid: '71684110-3142-0132-be1d-5f4c86fd3263',
      title: 'All Things Pivotal'
    },
    {
      uuid: '89beea90-5edf-012e-25b7-00163e1b201c',
      title: "Wachtel on the Arts from CBC Radio's Ideas"
    },
    {
      uuid: '8ea0e990-390d-0131-77d4-723c91aeae46',
      title: 'Android Developers Backstage'
    },
    {
      uuid: 'b618d3d0-960d-0132-f2e4-5f4c86fd3263',
      title: 'Toptal Podcast'
    },
    {
      uuid: 'd8fb5c80-1d1e-012f-f6d4-525400c11844',
      title: 'ShopTalk'
    },
    {
      uuid: 'e28d7cf0-9421-0132-efe5-5f4c86fd3263',
      title: 'Beats, Rye & Types'
    },
    {
      uuid: 'edde0b20-11bf-0131-69f8-723c91aeae46',
      title: "Podcasters' Roundtable - Podcasters Discussing Podcasting"
    },
    {
      uuid: 'c6d9c720-82e9-0131-8556-723c91aeae46',
      title: 'Bitcoins and Gravy!'
    },
    {
      uuid: '7b376e30-1b93-012e-00b3-00163e1b201c',
      title: 'Wiretap from CBC Radio'
    },
    {
      uuid: '86e084d0-1dae-012e-01b5-00163e1b201c',
      title: 'Common Sense with Dan Carlin'
    }
  ]
  /* spellchecker: enable */
}
