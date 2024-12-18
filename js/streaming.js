'use strict'

// testbed to try to accelerate 'streaming' or 'paged' item loading
// the goal is to lessen memory footprint while doing a global dedup...
const db = require('./lib/store').db
const log = require('./lib/log')
const store = require('./lib/store')
const delta = require('./lib/delta')
const utils = require('./lib/utils')

main()

async function main() {
  await store.db.init()
  await showRate('dbLoadByRange -Count', dbLoadByRange, counterHandlerG)
  await showRate('dbLoad        -Count', dbLoad, counterHandlerG)
  await showRate('dbLoadByRange -Dedup', dbLoadByRange, dedupHandlerG)
  await showRate('dbLoad        -Dedup', dbLoad, dedupHandlerG)
  await showRate('digestOfDigests', digestOfDigests)
  await store.db.end()
}

async function showRate(name, loader, handlerG) {
  console.log('---')
  const iterations = 1
  for (let i = 0; i < iterations; i++) {
    const pageSize = 10000 << i
    const start = +new Date()

    // make a new handler every iteration
    const handler = handlerG ? handlerG() : null

    const result = await loader(pageSize, handler)
    const elapsed = (+new Date() - start) / 1000
    const rate = (result.counter / elapsed).toFixed(0) + 'r/s'
    const mu = await utils.memoryUsageInMB()
    log.verbose(name, { ...result, elapsed, rate, pageSize, ...mu })
    await utils.collectGC()
  }
}

// counter - handler factory
function counterHandlerG() {
  let counter = 0
  const handler = async (item) => {
    counter++
  }
  handler.value = () => {
    return { counter }
  }
  return handler
}

// dedup - handler factory
// The handler has an attached gen.value() function which returns accumulated values
// This version depends on dedup ordering, and reset the history accumulator every uuid change
function dedupHandlerG() {
  let historyByType = new delta.AccumulatorByTypeByUuid()
  let uuidPrev = 'impossible'
  let uuidCount = 0
  let counter = 0
  let duplicates = 0
  const handler = async (item) => {
    if (!item.item) {
      item = { item }
    }

    if (item.item.uuid !== uuidPrev) {
      uuidPrev = item.item.uuid
      uuidCount++

      // resets the accumulator to : EMPTY
      historyByType = new delta.AccumulatorByTypeByUuid()
    }
    const changeCount = historyByType.merge(item.item)
    if (changeCount === 0) {
      duplicates++
    }
    counter++
  }
  handler.value = () => {
    return { counter, duplicates, uuidCount }
  }
  return handler
}

async function dbLoad(pageSize, handler) {
  await db.load({ user: 'daniel', pageSize }, handler, pageSize)
  return handler.value()
}
async function dbLoadByRange(pageSize, handler) {
  await db.loadByRangeWithDeadline(
    { user: 'daniel', pageSize, timeout: 100000 },
    handler,
    pageSize
  )
  return handler.value()
}

async function digestOfDigests(pageSize) {
  const digest = (await db.digestOfDigests()).substr(0, 7)
  // counter = (await db.digests()).length
  return { digest }
}
