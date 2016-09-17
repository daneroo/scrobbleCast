/* eslint-disable no-console */

const fs = require('fs')

compareAll()

function compareAll() {
  const hosts = ['darwin', 'dirac', 'euler'].map(h => h + '.imetrical.com')
  const users = ['daniel', 'stephane']
  const types = ['podcast', 'episode']

  types.forEach(t => {
    // console.log(`type: ${t}`)
    users.forEach(u => {
      // console.log(`user: ${u}`)
      console.log(`- ${t}-${u}`)

      pairs(hosts).forEach(([h1, h2]) => {
        console.log(`${short(h1)} <--> ${short(h2)}`)
        const f = (h) => `${h}/history-${u}-${t}.json`
        compare(f(h1), f(h1))
      })

    })
  })
}

// compare histories
function compare(f1, f2) {
  const hi1 = load(f1)
  const hi2 = load(f2)
  console.log(`lengths: ${hi1.length} ${hi2.length}`)
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
// load a file
function load(f) {
  console.log('loading', f)
  return fs.readFileSync('data/'+f, 'utf8')
}