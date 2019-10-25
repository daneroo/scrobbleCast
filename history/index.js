
const fs = require('fs')
const rp = require('request-promise-native')

const immutable = require('immutable')
const moment = require('moment')
const Map = immutable.Map
const List = immutable.List

const argv = require('yargs')
  .usage('Usage: $0 [options]')
  .help('h')
  .alias('h', 'help')
  .options({
    u: {
      alias: 'user',
      default: ['daniel', 'stephane'],
      describe: 'Specify a user',
      array: true
    },
    d: {
      alias: 'days',
      default: 30,
      describe: 'Number of days to fetch'
    },
    s: {
      alias: 'host',
      default: 'dirac.imetrical.com',
      describe: 'Host to fetch from (http://<host>:8000/api/history)'
    }
  })
  .argv

// console.log({argv})
const users = argv.user
const host = argv.host
const days = argv.days

console.log(`Fetching ${days} days of history from ${host} for user:${users}`)

all()
async function all() {
  // ['daniel'].forEach(u => {
  for (const u of users) {
    console.log(`\n- For ${u}`)
    await history({
      h: host,
      u: u
    })
  }
}

async function history(src) {
  // get the podcast title
  const podcasts = await loadHistoryAsList(src, 'podcast')
  const podcastTitlesAndThumb = mapBy(podcasts, 'uuid')
    .map(p => {
      return Map({ title: p.get('title'), thumbnail_url: p.get('thumbnail_url') })
    })
  // console.log(JSON.stringify(podcastTitlesAndThumb, null, 2))

  const episodes = (await loadHistoryAsList(src, 'episode'))
    // .slice(2).toMap()
    .map(curriedEpisodeProjection(podcastTitlesAndThumb))
    .map(playCounts)
    .filter(e => e.get('playedTime') > 0)
    .sortBy(e => e.get('lastPlayed'))
    .reverse()

  // console.log(JSON.stringify(episodes, null, 2))
  writeHistory(episodes, 14, src.u)
  summary(episodes)
  recentList(episodes, 14, 100)
}

function writeHistory(episodes, days, user) {
  const file = `data/history-${user}.json`
  console.log(` - Writing recent history: ${user}, ${days} days) (${file})`)
  const es = episodes.filter(sinceDaysFilter(days))
  fs.writeFileSync(file, JSON.stringify(es, null, 2))
}
function recentList(episodes, days = 3, maxEntries = 10) {
  console.log(`\n - Recently played (max ${days} days, ${maxEntries} entries)`)
  const es = episodes.filter(sinceDaysFilter(days))
  es
    .slice(0, maxEntries)
    .forEach(e => {
      const prop = e.get('playedProportion')
      const f = {
        podcast_title: e.get('podcast_title'),
        when: moment(e.get('lastPlayed')), //.fromNow(),
        percent: (prop < 0.9) ? '(' + (prop * 100).toFixed(0) + '%) ' : ''
      }
      console.log(`  ${f.when} ${f.percent}: ${f.podcast_title}: - ${e.get('title')}`)
    })
}

function summary(episodes) {
  const first = new Date(episodes.minBy(e => e.get('firstPlayed')).get('firstPlayed'))
  const last = new Date(episodes.maxBy(e => e.get('lastPlayed')).get('lastPlayed'))
  const days = (last.getTime() - first.getTime()) / 86400000

  console.log('\n - Totals')
  List([1, 7, 30, 365, Math.ceil(days)]).forEach(days => {
    const es = episodes.filter(sinceDaysFilter(days))
    const hours = sum(es, 'playedTime') / 3660
    console.log(`  Since ${days} days: ${hours.toFixed(1)} h (avg ${(hours / days).toFixed(1)} h/d)`)
    // episodes.filter(e=> e.lastPlayed)
  })

  console.log(`  Play Time: ${(sum(episodes, 'playedTime') / 3600).toFixed(1)} h`)
  console.log(`  Episodes: ${episodes.size} (played time>0)`)
  console.log(`  History of ${days.toFixed(1)} days :  (${first.toISOString().substr(0, 10)}-${last.toISOString().substr(0, 10)})`)
}

function sinceDaysFilter(days) {
  const since = daysAgo(days).getTime()
  return e => {
    const lp = new Date(e.get('lastPlayed')).getTime()
    return lp > since
  }
}
function daysAgo(days) {
  return new Date(+new Date() - 86400000 * days)
}
function sum(list, field) {
  return list.map(entry => entry.get(field)).reduce((prev, current) => prev + current)
}
// decorate each episode with play count and total
function playCounts(e) {
  const playM = (e.get('play') || Map())
    .sortBy((value, key) => { // just map the key(date), and use default comparator
      return +new Date(key)
    })
  let play = playM
    .toList()

  // trim last 0
  // TODO(daneroo) (trim all zeroes instead???)
  play = (play.last() === 0) ? play.pop() : play

  const playCount = play.size
  const playedTime = play.max() || 0
  const playedProportion = playedTime / e.get('duration')

  // with dates.. use a big reduce to do all this
  // console.log('--playM', playM)
  const epoch = new Date(0)
  // remove zeroes
  const orderedPlayDates = List(playM.filter(pos => pos > 0).keys()) // first()
  const firstPlayed = orderedPlayDates.first() || epoch
  const lastPlayed = orderedPlayDates.last() || epoch
  return e
    .set('playCount', playCount)
    .set('playedTime', playedTime)
    .set('firstPlayed', firstPlayed)
    .set('lastPlayed', lastPlayed)
    .set('playedProportion', playedProportion)
}

function curriedEpisodeProjection(podcastTitlesAndThumb) {
  return e => {
    const lkup = podcastTitlesAndThumb.get(e.get('podcast_uuid')) || Map({})
    // explicitly call sortBY, because history keys were coming out not-sorted whic was not the case in the database or service.
    // sortBy: can use: comparatorValueMapper: (value: V, key: K, iter: this) => C,
    const sortByKey = (value, key, itter) => key

    return Map({
      // __lastUpdated: e.get('meta').get('__lastUpdated'),
      uuid: e.get('uuid'),
      podcast_uuid: e.get('podcast_uuid'),
      podcast_title: lkup.get('title'),
      thumbnail_url: lkup.get('thumbnail_url'),
      title: e.get('title'),
      duration: e.get('duration'),
      status: e.get('history').get('playing_status').sortBy(sortByKey),
      play: e.get('history').get('played_up_to').sortBy(sortByKey)
    })
  }
}

function mapBy(list, field) { // e.g. 'uuid'
  return Map(list.map(h => [h.get(field), h]))
}

// load a  History file (list of maps(all have uuid))
async function loadHistoryAsList(src, type) {
  // const object = await fromFile(src, type)
  const object = await fromHost(src, type)
  console.log(`read ${object.length} from ${src.h}`)
  const list = immutable.fromJS(object)
  return list
}

async function fromHost(src, type) {
  const since = (type === 'podcast')
    ? '1970-01-01T00:00:00Z'
    : new Date(+new Date() - (days * 24 * 60 * 60 * 1000)).toISOString()

  var options = {
    uri: `http://${src.h}:8000/api/history`,
    qs: { user: src.u, type, since },
    json: true // Automatically parses the JSON string in the response
  }
  const object = await rp(options)
  return object
}

// // how we use to load files
// async function fromFile (src, type) {
//   const filename = `data/${src.h}/history-${src.u}-${type}.json`
//   const content = fs.readFileSync(filename, 'utf8')
//   const object = JSON.parse(content)
//   return object
// }
