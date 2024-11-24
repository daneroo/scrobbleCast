'use strict'

// Accumulate delta history per user/__type/uuid
// Also writes the history to db.history
// deduplication is full, but persisting to table is conservative:
// only write (upsert history) if:
//   --lastUpdated is in a time window (24hrs)
//   --podcast uuid is in scrape.spread deep (once every 24hrs)

// dependencies - core-public-internal
const log = require('./log')
// -- Implementation functions
const { db } = require('./store')

// Exported API
exports = module.exports = {
  dedupStampTask
}

// We were keeping multiple items for the same _stamp,
// and sometimes they contain conflicting values which causes flapping.
// This task removes all but the last item for a given stamp (as sorted by dedup order, which includes __sourceType).
async function dedupStampTask(credentials) {
  const user = credentials.name
  const counts = {
    total: 0,
    duplicates: 0, // duplicated items (different __sourceType) for same stamp
    keepers: 0
  }

  // to accumulate duplicates
  const duplicates = []

  // to break items on uuid boundaries
  let lastSeen = '' // composite key: {__user, __type, uuid,__stamp}

  const sameStamp = []
  async function itemHandlerRemover({ item }) {
    const { __user, __type, uuid, __stamp } = item
    const seeing = JSON.stringify({ __user, __type, uuid, __stamp })
    // if we have a new __stamp, mark all but last as duplicates
    if (lastSeen !== seeing) {
      lastSeen = seeing
      if (sameStamp.length > 1) {
        // const last = sameStamp.slice(-1)?.[0]
        // console.log('- |sameStamp|:', sameStamp.length, 'delete all but last', last?.__stamp, last?.uuid)
        duplicates.push(...sameStamp.slice(0, -1)) // n-1 first are duplicates
        counts.duplicates += sameStamp.length - 1 // n-1, the other is a keeper
      }
      counts.keepers += 1 // and n-1 are duplicates
      sameStamp.length = 0
    }

    sameStamp.push(item)
    counts.total++
    // if (counts.total % 100000 === 0) {
    //   console.log('... ', { counts })
    // }
  }

  try {
    await db.loadByRangeWithDeadline(
      { user, timeout: 120000 },
      itemHandlerRemover
    )
    // last flush of sameStamp Accumulator
    if (sameStamp.length > 1) {
      // const last = sameStamp.slice(-1)[0]
      // console.log('= |sameStamp|:', sameStamp.length, 'delete all but last', last?.__stamp, last?.uuid)
      duplicates.push(...sameStamp.slice(0, -1)) // n-1 first are duplicates
      counts.duplicates += sameStamp.length - 1 // n-1, the other is a keeper
    }
    sameStamp.length = 0

    // now remove the duplicates
    await db.removeAllByBatch(duplicates)

    return counts
  } catch (error) {
    // TODO: might remove this altogether
    log.error('Dedup', {
      error
    })
    throw error
  }
}
