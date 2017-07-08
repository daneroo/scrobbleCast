'use strict'

// testbed to try to accelarate 'streaming' or 'paged' item loading
// the goal is to lessen memory footprint while doing a global dedup...
const orm = require('./lib/model/orm')
// const db = require('./lib/store').db
const log = require('./lib/log')
var delta = require('./lib/delta')

const utils = require('./lib/utils')

main()

async function main () {
  await utils.logMemAfterGC()

  // await showRate('dbLoad', dbLoad)
  await showRate('ormFind', ormFind)
}

async function showRate (name, func) {
  const iterations = 4
  for (let i = 0; i < iterations; i++) {
    const start = +new Date()
    const items = await func()
    const elapsed = (+new Date() - start) / 1000
    const rate = (items / elapsed).toFixed(0) + 'r/s'
    const mu = await utils.memoryUsageInMB()
    log.verbose(name, Object.assign({ items: items, elapsed: elapsed, rate: rate }, mu))
  }
}

async function ormFind () {
  const items = await orm.Item.findAll({
    attributes: ['item'],
    where: { '__user': 'daniel' },
    order: ['__user', '__stamp', '__type', 'uuid', '__sourceType']
  })

  const historyByType = new delta.AccumulatorByTypeByUuid()
  let counter = 0
  let duplicates = 0
  const handler = async item => {
    // historyByType.merge(item)
    const changeCount = historyByType.merge(item)
    if (changeCount === 0) {
      duplicates++
    }
    counter++
  }

  // can be much faster bu not serialized!
  // TODO(daneroo):what if we grouped by uuid
  // items.forEach(handler)

  for (let item of items) {
    await handler(item.item)
  }

  return counter + duplicates
}

// async function dbLoad () {
//   let counter = 0
//   await db.load({ filter: { __user: 'daniel' } }, item => counter++)
//   return counter
// }
