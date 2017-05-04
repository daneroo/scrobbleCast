/* eslint-disable no-console */

const fs = require('fs')
const immutable = require('immutable')

compareAll()

function compareAll() {
  // const hosts = ['darwin', 'dirac', 'euler'].map(h => h + '.imetrical.com')
  // const hosts = ['darwin', 'dirac'].map(h => h + '.imetrical.com')
  const hosts = ['dirac', 'euler'].map(h => h + '.imetrical.com')

  const users = ['daniel', 'stephane']
  // const users = ['daniel']

  const types = ['podcast', 'episode']
  // const types = ['episode']
  // const types = ['episodeZ']

  combinatorics(types, users, hosts, (t, u, [h1, h2]) => {
    console.log(`- ${t}-${u} Comparing ${short(h1)} <--> ${short(h2)}`)
    // filename for host
    const f = (h) => `${h}/history-${u}-${t}.json`

    // select compare, quickComapre
    compareHistory([h1, h2].map(f).map(loadHistory))
    // quickCompareHistory([h1, h2].map(f).map(loadHistory))
  })
}

// apply f_tuph forall types, users, and pairs of hosts
// f_tuh(t,u,[h1,h2])
function combinatorics(ts, us, hs, f_tuph) {
  ts.forEach(t => {
    us.forEach(u => {
      // console.log(`- ${t}-${u}`)
      pairs(hs).forEach(([h1, h2]) => {
        f_tuph(t, u, [h1, h2])
      })
    })
  })
}

// quick compare histories
function quickCompareHistory([m1, m2]) {
  console.log(` equals `,immutable.is(m1,m2))
  const [nm1,nm2] = [m1,m2].map(removeHistoryAndMetaFromMap)
  console.log(` w/o hist,meta `,immutable.is(nm1,nm2))

}
// compare histories
function compareHistory([m1, m2]) {
  const diffs = removeCommon([m1, m2])
  // console.log('=diffs', JSON.stringify(diffs, null, 2))

  const merged = prettyMerge(diffs)
  console.log('=merged', JSON.stringify(merged, null, 2))
}

function removeHistoryAndMetaFromMap(m) {
  return m.map(v => v.delete('history').delete('meta'))
}
// these now have removed common (do they have equivalent keys?)
function prettyMerge([m1, m2]) {
  const k1 = immutable.Set(m1.keys())
  const k2 = immutable.Set(m2.keys())
  const allkeys = k1.union(k2)
  const merged = immutable.Map(allkeys.map(k => {
    const m1k = m1.get(k)
    const m2k = m2.get(k)
    if (!immutable.Map.isMap(m1k) || !immutable.Map.isMap(m2k)) {
      // return [k, [m1k, m2k]] //leaf
      const show = (x) => (typeof x == 'undefined' || x === null) ? '?' : x
      return [k, [show(m1k), show(m2k)].join(' => ')] //leaf
    }
    return [k, prettyMerge([m1k, m2k])]
  }))
  return merged
}
// remove common elements from 2 maps => returns both maps
function removeCommon([m1, m2]) {
  if (!immutable.Map.isMap(m1) || !immutable.Map.isMap(m2)) {
    // console.log('!diffs', JSON.stringify([m1, m2], null, 2))
    return [m1, m2]
  }
  // console.log('removeCommon',m1.toString().substr(0,70))
  const k1 = immutable.Set(m1.keys())
  const k2 = immutable.Set(m2.keys())
  const allkeys = k1.union(k2)
  // line up the entries
  const tuples = allkeys.map(k => [k, m1.get(k), m2.get(k)])
  // remove identical tuples
  const diffs = tuples.filter(([k, p1, p2]) => !immutable.is(p1, p2))

  const rdiffs = diffs.map(([k, p1, p2]) => {
    const [rp1, rp2] = removeCommon([p1, p2])
    return [k, rp1, rp2]
  })
  const m1d = immutable.Map(rdiffs.map(([k, p1, p2]) => [k, p1]))
  const m2d = immutable.Map(rdiffs.map(([k, p1, p2]) => [k, p2]))

  return [m1d, m2d]
}

function short(long) {
  return long.split('.')[0]
}
// console.log('pairs',pairs([1, 2, 3]))
function pairs(list) {
  if (list.length < 2) { return [] }
  const first = list[0]
  const rest = list.slice(1)
  const restpairs = rest.map(x => [first, x])
  return restpairs.concat(pairs(rest))
}
// load a  History file (list of maps(all have uuid))
function loadHistory(f) {
  // console.log('loading', f)
  // const o = [{a:1,b:[2,22]},{a:3,b:[4,44]}]
  const o = JSON.parse(fs.readFileSync('data/' + f, 'utf8'))
  const list = immutable.fromJS(o)
  const map = immutable.Map(list.map(h => [h.get('uuid'), h]))
  return map
}