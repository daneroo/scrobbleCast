
const fs = require('fs')
const immutable = require('immutable')
const Map = immutable.Map
const List = immutable.List

all()

function all() {
  ['daniel', 'stephane'].forEach(u => {
    console.log(`== For ${u}`)
    history({
      h: 'dirac.imetrical.com',
      u: u
    })
  })
}

function history(src) {
  const f = (src, t) => `${src.h}/history-${src.u}-${t}.json`

  // get the podcast title
  const podcastTitles = mapBy(loadHistoryAsList(f(src, 'podcast')), 'uuid')
    .map(p => p.get('title'))
  // console.log(JSON.stringify(podcastTitles, null, 2))

  const episodes = loadHistoryAsList(f(src, 'episode'))
    // .slice(2).toMap()
    .map(curriedEpisodeProjection(podcastTitles))
    .map(play_counts)
    .filter(e => e.get('playedTime') > 0) // (playedTime>0)
  // .map(e=> e.delete('play'))  // clean

  // console.log(JSON.stringify(episodes, null, 2))

  List([1, 7, 30, 60, 365]).forEach(days => {
    const since = daysAgo(days).getTime()
    const es = episodes.filter(e => {
      const lp = new Date(e.get('lastPlayed')).getTime()
      return lp > since
    })
    // console.log('total played', sum(episodes, 'playedTime'))
    const hours = sum(es, 'playedTime') / 3660
    console.log(`played since ${days} days: ${hours.toFixed(1)} (avg ${(hours / days).toFixed(1)} h/d)`)
    // episodes.filter(e=> e.lastPlayed)
  })

  console.log(`total play Time: ${(sum(episodes, 'playedTime') / 3600).toFixed(1)} `)
  console.log('total episondes (played>0)', episodes.size)
  const first = new Date(episodes.minBy(e => e.get('firstPlayed')).get('firstPlayed'))
  const last = new Date(episodes.maxBy(e => e.get('lastPlayed')).get('lastPlayed'))
  const days = (last.getTime() - first.getTime()) / 86400000
  console.log(`history of ${days.toFixed(1)} days :  ${first.toISOString()}-${last.toISOString()} `)

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

function curriedEpisodeProjection(podcastTitles) {
  return (e => {
    return Map({
      // __lastUpdated: e.get('meta').get('__lastUpdated'),
      uuid: e.get('uuid'),
      puuid: e.get('podcast_uuid'),
      ptitle: podcastTitles.get(e.get('podcast_uuid')),
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