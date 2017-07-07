'use strict'

// dependencies - core-public-internal
var _ = require('lodash')
var Table = require('cli-table')
var colors = require('colors/safe') // don't touch String prototype
var log = require('./lib/log')
var logcheck = require('./lib/logcheck')

const showRawRecords = false
const justTask = false

main()

async function main () {
  log.verbose('Starting LogCheck')
  if (justTask) {
    logcheck.logcheckTask()
  } else {
    //
    // Find items logged between today and yesterday.
    //
    try {
      const checkpointRecords = await logcheck.getCheckpointRecords()
      // console.log(JSON.stringify(checkpointRecords, null, 2))

      if (showRawRecords) {
        showRecords(checkpointRecords)
      }

      // {host:stamp}
      const nonReporting = logcheck.detectNonReporting(checkpointRecords, new Date())
      for (let host in nonReporting) {
        log.error('logcheck.noreport', { host: host, since: nonReporting[host] })
      }

      const reportingRecords = logcheck.removeNonReporting(checkpointRecords, nonReporting)
      logcheck.detectMismatch(reportingRecords)

      aggRecords(reportingRecords)
    } catch (error) {
      log.error('logcheck.error', error)
    }
  }
}

// group by stamp rounded to 10min
// deduplicate, or find first match
// this function assumes that incoming records are descending
function aggRecords (records) {
  const hosts = distinct(records, 'host') // these are sorted
  const NOVALUE = '-no value-'
  function emptyHostMap () { // function bound to hosts, which is an array
    return _.reduce(hosts, function (result, value /* , key */) {
      result[value] = NOVALUE
      return result
    }, {})
  }

  // map [{stamp, host, digest}] - array of obj
  // to [[ stamp, host1-digest,.. hostn-digest]] - array of arrays
  function makeTableStampByHost () { // function is bound to records
    var digestbyStampByHost = {}
    _(records).each(function (r) {
      // stamp is rounded to 10min so we can match entries.
      var stamp = r.stamp.replace(/[0-9]:[0-9]{2}(\.[0-9]*)?Z$/, '0:00Z') // round down to 10:00

      digestbyStampByHost[stamp] = digestbyStampByHost[stamp] || emptyHostMap()
      if (digestbyStampByHost[stamp][r.host] === NOVALUE) {
        digestbyStampByHost[stamp][r.host] = r.digest
      } else {
        // console.log('Not overwriting, assuming DESC stamp order', stamp, r.host)
        // console.log('keep', digestbyStampByHost[stamp][r.host])
        // console.log('discard', r.digest)
      }
    })

    // [stamp, digestOfHost1, digestOfHost2, digestOfHost3,...]
    var rows = []
    // keep the table in reverse chronological order
    _.keys(digestbyStampByHost).sort().reverse().forEach(function (stamp) {
      const row = [stamp]
      _.keys(digestbyStampByHost[stamp]).sort().forEach(function (host) {
        row.push(digestbyStampByHost[stamp][host])
      })
      rows.push(row)
    })
    return rows
  }

  var rows = makeTableStampByHost()

  // reformat
  function shortDate (stampStr) {
    return stampStr.substr(11, 9)
  }

  rows = rows.map(row => {
    // adjust the output each row in stamp, digest,digest,..
    return row.map((v, idx) => {
      if (idx === 0) { // this is the stamp
        return shortDate(v)
      }
      return v.substr(0, 7) // shortDigest a la github
    })
  })

  // keep only until first match
  var foundIdentical = false
  rows = rows.filter((row) => {
    // is all digests's are equal (1 distinct vale)
    if (!foundIdentical && _.uniq(row.slice(1)).length === 1) {
      foundIdentical = true
      row[0] = colors.green(row[0])
      return true
    }
    return !foundIdentical
  })

  // now the ouput - as table
  var shortHosts = hosts.map(host => {
    return host.split('.')[0] // shortHost
  })
  var header = ['checkpoint'].concat(shortHosts)
  var table = newTable(header)
  rows.forEach(row => {
    table.push(row)
  })
  console.log(table.toString())
}

function distinct (records, field) {
  var values = {}
  records.forEach(function (r) {
    var value = r[field]
    values[value] = true
  })
  return Object.keys(values).sort()
}

// Just print th records in a table, possible elipse to remove middle rows...
function showRecords (records) {
  // console.log(records)
  var origRecords = records // needs to be returned to the promise chain
  if (!records || !records.length) {
    return origRecords
  }

  const ellipsis = false
  const howMany = 3
  if (ellipsis && records.length > (howMany * 2)) {
    var dotdotdot = blankedObject(records[0], '.')
    records = records.slice(0, howMany).concat(dotdotdot, records.slice(-howMany))
  }

  var table = newTable(['stamp', 'host', 'digest'])
  records.forEach(function (r) {
    var record = [r.stamp, r.host, r.digest]
    table.push(record)
  })
  console.log(table.toString())
}

// Utility to create an object with same keys, but default values
function blankedObject (obj, defaultValue) {
  defaultValue = defaultValue === undefined ? '' : defaultValue
  return _.reduce(obj, function (result, value, key) {
    result[key] = defaultValue
    return result
  }, {})
}

// Utility to create our formatted table
function newTable (head) {
  // var table = new Table();
  var table = new Table({
    head: head || [],
    chars: {
      'mid': '',
      'left-mid': '',
      'mid-mid': '',
      'right-mid': ''
    }
  })
  return table
}
