// node --harmony-async-iteration asyncIterator.js
const delay = ms => new Promise(resolve => {
  setTimeout(() => resolve(ms), ms)
})

class Counter {
  constructor (upper) {
    this.upper = upper
  }

  * [Symbol.iterator] () {
    for (let i = 0; i < this.upper; i++) {
      yield i
    }
  }
}

function * fCounter (upper) {
  for (let i = 0; i < upper; i++) {
    yield i
  }
}

main()
async function main () {
  const rows = 3
  const cols = 5

  // await delay(500)

  for (let row of fCounter(rows)) {
    for (let col of new Counter(cols)) {
      console.log({row, col})
    }
    console.log('---')
  }
}
