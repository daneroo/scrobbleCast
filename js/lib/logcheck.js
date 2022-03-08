'use strict'

// This abstracts querying the loggly endpoint
// this allows us to coordinate/and compare the logging output from many running clients

// The first use case is to pull the end of job logs on all nodes (md5 after dedup)
// A second check could be that rollup has been run for the current month.

// Uses native Promise

// dependencies - core-public-internal
const loggly = require('loggly')
const { JSONCodec } = require('nats')
const _ = require('lodash')
const log = require('./log')
const nats = require('./nats')
const config = require('./config')
const { stream } = require('winston')

exports = module.exports = {
  // TODO(daneroo): add tests
  logcheckTask,
  getCheckpointRecords,
  getCheckpointRecordsNats,
  detectMismatch,
  // below are Tested
  removeNonReporting,
  detectNonReporting,
  // exposed for testing
  lastReportedDigest,
  lastReportedStamp,
  lastReportedRecord,
  parseCheckpointEvents
}

// TODO(daneroo) include latest stamp information
// convenience to be run from task.
// run the query, detection and log it!
async function logcheckTask () {
  try {
    for (const [method, fetcher] of Object.entries({
      loggly: getCheckpointRecords,
      nats: getCheckpointRecordsNats
    })) {
      const checkpointRecords = await fetcher()

      // {host:stamp}
      const nonReporting = detectNonReporting(checkpointRecords, new Date())
      for (const host in nonReporting) {
        log.error('logcheck.noreport', {
          host: host,
          since: nonReporting[host]
        })
      }

      const reportingRecords = removeNonReporting(
        checkpointRecords,
        nonReporting
      )

      detectMismatch(reportingRecords)
    }
  } catch (error) {
    log.error('logcheck: %s', error)
  }
}

//  return an array of {}
async function getCheckpointRecords () {
  // The search options can be parametrized later (hours,runs...)
  var searchOptions = {
    query:
      'tag:pocketscrape AND json.message:checkpoint AND json.scope:item AND json.digest:*',
    from: '-24h',
    until: 'now',
    order: 'desc', // which is the default
    // max size is about 1728=12*24*6, entiresPerRun*24h(retention) * 6runs/hour
    // at 12 entries per task run: 2 type * 2 users * 3 hosts, so this is 36 runs, or 6 hours.
    size: 200
  }

  const events = await queryLoggly(searchOptions)
  return parseCheckpointEvents(events)
}

// same stream is used for digests of scope item and history
async function getCheckpointRecordsNats (scopeFilter = 'item') {
  const records = []
  const streamName = 'scrobblecastDigest'
  const subjects = [
    'im.scrobblecast.scrape.digest',
    'im.scrobblecast.scrape.digest.>'
  ]

  const maxAge = 86400e9 // 24h in nanoseconds (stream retention)
  const deltaMS = 12 * 3600 * 1e3 // 12h in ms
  try {
    const stream = await nats.findOrCreateStream(streamName, subjects, maxAge)
    const asyncMessageIterator = nats.replayMessages(
      stream,
      subjects[0],
      deltaMS
    )
    const jc = JSONCodec()

    let fetched = 0
    for await (const m of asyncMessageIterator) {
      fetched++
      // log.debug('--', m.seq, m.info.pending, m.subject, jc.decode(m.data))
      const { stamp, host, digest, scope } = jc.decode(m.data)
      if (scope === scopeFilter) {
        const record = { stamp, host, digest }
        records.push(record)
      }
    }
    log.verbose('logcheck.query.nats', {
      fetched,
      filtered: records.length,
      total_messages: stream?.state?.messages
    })
  } catch (err) {
    log.error(`nats error: ${err.message}`, err)
  }

  return records
}

// Simply logs as error, which sends it back to loggly
// This detects if hash signatures match across reporting hosts
//  return false if all match
// reurn lastDigests if matches fail
function detectMismatch (records) {
  const lastDigests = lastReportedDigest(records)
  const allMatch = _.uniq(Object.values(lastDigests)).length === 1
  if (!allMatch) {
    const pretty = {}
    for (const host in lastDigests) {
      const shortHost = host.split('.')[0]
      const shortDigest = lastDigests[host].substr(0, 7)
      pretty[shortHost] = shortDigest
    }
    log.warn('logcheck.mismatch', pretty)
    return lastDigests
  } else {
    var hostCount = Object.values(lastDigests).length
    log.info('logcheck.match', {
      hostCount: hostCount,
      logRecords: records.length
    })
    return false
  }
}

function removeNonReporting (records, nonReporting) {
  const reportingRecords = records.filter(record => !nonReporting[record.host])
  return reportingRecords
}
// return {host:stamp} that have not reported since (since - howRecent)
function detectNonReporting (records, since) {
  since = since || new Date().toISOString()
  const howRecentMS = 20 * 60 * 1000
  const last = lastReportedStamp(records)
  // console.log('lastReported', JSON.stringify(last, null, 2))
  const threshhold = new Date(+new Date(since) - howRecentMS).toISOString()
  const nonReporting = {}
  for (const host in last) {
    const lastStamp = last[host]
    if (lastStamp < threshhold) {
      nonReporting[host] = lastStamp
    }
  }
  return nonReporting
}

function lastReportedStamp (records) {
  const map = lastReportedRecord(records)
  const projected = {}
  for (const host in map) {
    projected[host] = map[host].stamp
  }
  return projected
}

function lastReportedDigest (records) {
  const map = lastReportedRecord(records)
  const projected = {}
  for (const host in map) {
    projected[host] = map[host].digest
  }
  return projected
}

// host=>record (where record is the most recent entry(by stamp) for host)
function lastReportedRecord (records) {
  return records.reduce((when, record) => {
    if (when[record.host] && when[record.host].stamp > record.stamp) {
      // early return: already latest stamp
      return when
    }
    when[record.host] = record
    return when
  }, {})
}

// receives loggly events for checkpoint.
// depends on events having {timestamp,tags:['host-,..],event.json.digest}
// and returns an array of {stamp,host,digest}
function parseCheckpointEvents (events) {
  var records = []

  events.forEach(function (event) {
    // log.debug('event', event)
    // stamp is no longer rounded here: moved to aggregator function
    const stamp = new Date(event.timestamp).toJSON()

    // host from tags: [ 'pocketscrape', 'host-darwin.imetrical.com' ]
    const hostRE = /^host-/
    const defaultHost = 'unknown'
    // return the last matching host, with suitable default
    const host = event.tags.reduce(
      (host, tag) => (tag.match(hostRE) ? tag.replace(hostRE, '') : host),
      defaultHost
    )

    // skip if event.event.json.digest not found
    if (event.event && event.event.json && event.event.json.digest) {
      const digest = event.event.json.digest

      var record = {
        stamp: stamp,
        host: host,
        digest: digest
      }

      records.push(record)
    }
  })
  return records
}

// This function uses the node-loggly module directly, instead of winston-loggly
// This makes this module more independant.
async function queryLoggly (searchOptions) {
  return new Promise(function (resolve, reject) {
    const client = loggly.createClient(config.loggly)
    client.search(searchOptions).run(function (err, results) {
      if (err) {
        // the error object doesn't work with loggly, convert to string to send
        log.error('logcheck.query: %s', err)
        reject(err)
      } else {
        log.verbose('logcheck.query.loggly', {
          fetched: results.events.length,
          total_events: results.total_events
        })
        resolve(results.events)
      }
    })
  })
}
