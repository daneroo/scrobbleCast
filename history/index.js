
const fs = require('fs')
const immutable = require('immutable')
const moment = require('moment')
const Map = immutable.Map
const List = immutable.List

all()

function all() {
  // ['daniel'].forEach(u => {
  ['daniel', 'stephane'].forEach(u => {
    console.log(`\n- For ${u}`)
    history({
      h: 'dirac.imetrical.com',
      u: u
    })
  })
}

function history(src) {
  const f = (src, t) => `${src.h}/history-${src.u}-${t}.json`

  // get the podcast title
  const podcastTitlesAndThumb = mapBy(loadHistoryAsList(f(src, 'podcast')), 'uuid')
    .map(p => {
      return Map({ title: p.get('title'), thumbnail_url: p.get('thumbnail_url') })
    })
  // console.log(JSON.stringify(podcastTitlesAndThumb, null, 2))

  const episodes = loadHistoryAsList(f(src, 'episode'))
    // .slice(2).toMap()
    .map(curriedEpisodeProjection(podcastTitlesAndThumb))
    .map(play_counts)
    .filter(e => e.get('playedTime') > 0)

  // console.log(JSON.stringify(episodes, null, 2))
  writeHistory(episodes, 14, src.u)
  summary(episodes)
  recentList(episodes, 7, 10)
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
        when: moment(e.get('lastPlayed')).fromNow(),
        percent: (prop < .9) ? '(' + (prop * 100).toFixed(0) + '%) ' : ''
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
  return list.map(entry => entry.get(field)).reduce((prev, current) => prev + current);
}
// decorate each episode with play count and total
function play_counts(e) {
  const playM = (e.get('play') || Map())
    .sortBy((value, key) => { // just map the key(date), and use default comparator
      return +new Date(key);
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
  const orderedPlayDates = List(playM.filter(pos => pos > 0).keys()) //first()
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
  return (e => {
    const lkup = podcastTitlesAndThumb.get(e.get('podcast_uuid')) || Map({})
    return Map({
      // __lastUpdated: e.get('meta').get('__lastUpdated'),
      uuid: e.get('uuid'),
      podcast_uuid: e.get('podcast_uuid'),
      podcast_title: lkup.get('title'),
      thumbnail_url: lkup.get('thumbnail_url'),
      title: e.get('title'),
      duration: e.get('duration'),
      status: e.get('history').get('playing_status'),
      play: e.get('history').get('played_up_to')
    })
  })
}

function mapBy(list, field) { // e.g. 'uuid'
  return Map(list.map(h => [h.get(field), h]))
}
// load a  History file (list of maps(all have uuid))
function loadHistoryAsList(f) {
  // console.log('loading', f)
  // const o = [{a:1,b:[2,22]},{a:3,b:[4,44]}]
  const o = JSON.parse(fs.readFileSync('data/' + f, 'utf8'))
  const list = immutable.fromJS(o)
  return list
}