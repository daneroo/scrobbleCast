// This will insert a batch of items, but only if they would survive deduplication
// The outcome will insert any new non-duplicate items, as well as delete any duplicates
// Further it should be able to track which uuid's (user,type,uuid) should be marked for history update

// dependencies - core-public-internal
const _ = require('lodash')
const db = require('../store/db')
const delta = require('../delta')
const dedup = require('../dedup')
const utils = require('../utils')
const log = require('../log')

exports = module.exports = {
  insertDedup,
  dedupOrderComparator,
  dedupWithNewItem
}

// TODO:daneroo
async function insertDedup (items) {
  // sort items in dedup order, group by {__user, __type, uuid}
  // dedup order: db.
  const allInserts = []
  const allDuplicates = []
  for (const item of items) {
    const hitems = await db.loadItemsForHistory(item)
    const {toInsert, duplicates, history} = await dedupWithNewItem(item, hitems)
    allInserts.push(...toInsert)
    allDuplicates.push(...duplicates)
    if (toInsert.length > 0 || duplicates.length > 0) {
      // console.log({toInsert, duplicates, history})
      await dedup.upsertHistory(history)
    }
  }
  const counts = {items: items.length, inserted: allInserts.length, deleted: allDuplicates.length}
  if (allInserts.length > 0) {
    await db.saveAll(allInserts)
  }
  if (allDuplicates.length > 0) {
    await dedup.deleteDuplicates(allDuplicates)
  }
  if (allInserts.length > 0 || allDuplicates.length > 0) {
    log.verbose('insertDedup', counts)
  }
  return counts
}

async function dedupWithNewItem (item, hitems) {
  const toInsert = []
  const duplicates = []
  hitems.push(item)
  // const idx = _.sortedIndex(hitems, item, dedupOrderComparator)
  // console.log('\n@' + idx, JSON.stringify(dedupOrderComparator(item)))
  const sorted = _.sortBy(hitems, dedupOrderComparator)
  const history = new delta.Accumulator()
  for (const hi of sorted) {
    const isNewItem = (hi === item)
    // const flag = isNewItem ? '+' : '-'
    // console.log(flag, JSON.stringify(dedupOrderComparator(hi)))
    const changeCount = history.merge(hi).length
    if ((changeCount === 0) && !isNewItem) { // duplicate (not new), should delete
      duplicates.push(hi)
    }
    if ((changeCount !== 0) && isNewItem) { // not a duplicate, should insert
      toInsert.push(hi)
    }
  }
  return {toInsert, duplicates, history}
}

// comparator which implementes sorting by: db.fieldOrders.dedup
// must calculate it's own dogest
function dedupOrderComparator (item) {
  const {__user, __type, uuid, __stamp, __sourceType} = item
  const digest = utils.digest(JSON.stringify(item))
  return [__user, __type, uuid, __stamp, __sourceType, digest]
}
