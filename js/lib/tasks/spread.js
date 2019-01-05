// dependencies - core-public-internal
const crypto = require('crypto')
// var log = require('../log')
const store = require('../store')

// Exported API
exports = module.exports = {
  select,
  getRecentPodcastUuids,
  selectName,
  selectFromOffsets,
  uuidOffset,
  stampOffset,
  zeroOffsetUUID: '3e11b817-7e15-4f21-81b6-7330725dd91a' // or 403b6616-669f-4504-bdf7-77de76ee7c59,...
}

function selectName (s) {
  return (s === 0) ? 'deep'
    : (s === 1) ? 'shallow'
      : (s === 2) ? 'recent'
        : 'skip'
}

// Matches schedule for uuid with stamp, returns:
//  -1: if we are meant to skip
//   0: if we are meant to do a deep scan (all pages)
//   1: if we are meant to do a shallow scan (first page) (deprected)
//   2: if we are meant to scan because of being recently played
function select (stamp, uuid, recentPodcastUuids = {}) {
  if (uuid in recentPodcastUuids) {
    return 2
  }
  return selectFromOffsets(stampOffset(stamp), uuidOffset(uuid))
}

// return a map of {podcast_uuid:true} for all recently played podcasts
async function getRecentPodcastUuids (user, hoursAgo = 4) {
  const params = {
    user,
    since: new Date(+new Date() - (hoursAgo * 60 * 60 * 1000)).toISOString()
  }
  const rows = await store.db.history(params)
  const recentlyPlayed = rows.filter(row => '__lastPlayed' in row.meta)
  const recentPodcastUuids = recentlyPlayed.reduce((acc, cur) => {
    acc[cur.podcast_uuid] = true // or 'cur' if you want to return the actual row
    return acc
  }, {})
  return recentPodcastUuids
}

// -- Implementation functions

function selectFromOffsets (stampOffset, uuidOffset) {
  const combinedOffset = (stampOffset + 144 - uuidOffset) % 144
  if (combinedOffset === 0) {
    return 0
  }
  if (combinedOffset % 6 === 0) {
    return 1
  }
  return -1
}

// uuidOffset returns an offset between [0,144)
// The offset represents an offset from midnight in (ten minute) units
function uuidOffset (uuid, {algorithm = 'md5', numBytes = 8} = {}) {
  var h = crypto.createHash(algorithm).update(uuid).digest('hex')
  // first numBytes chars (8x4=32 bits) -> int -> % 144
  const offset = (parseInt(h.slice(0, numBytes), 16)) % 144
  // console.log({uuid, h, offset})
  return offset
}

// returns the offset for the ISO8601 stamp
// The offset represents an offset from midnight in (ten minute) units
function stampOffset (stamp) {
  const startOfDay = stamp.substr(0, 10) + 'T00:00:00Z'

  const diff = +new Date(stamp) - new Date(startOfDay)
  // number of (full) ten minute periods since 00:00
  const offset = Math.floor(diff / 1000 / 60 / 10)
  return offset
}
