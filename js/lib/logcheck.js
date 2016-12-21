'use strict';

// This abstracts querying the loggly endpoint
// this allows us to coordinate/and compare the logging output from many running clients

// The first use case is to pull the end of job logs on all nodes (md5 after dedup)
// A second check could be that rollup has been run for the current month.

// Uses native Promise

// dependencies - core-public-internal
var fs = require('fs');
var loggly = require('loggly');
var _ = require('lodash');
var log = require('./log');

exports = module.exports = {
  // query: queryLoggly, // need to parametrized before being exposed
  detectMismatchTask: detectMismatchTask,
  getMD5Records: getMD5Records,
  detectMismatch: detectMismatch
};

var config = JSON.parse(fs.readFileSync('credentials.loggly.json').toString());
var client = loggly.createClient(config);

function getMD5Records() {
  // The search options can be parametrized later (hours,runs...)
  var md5SearchOptions = {
    query: 'tag:pocketscrape AND json.md5 AND json.file:history-*',
    from: '-24h',
    until: 'now',
    order: 'desc', // which is the default
    // max size is about 1728=12*24*6, entiresPerRun*24h(retention) * 6runs/hour
    // at 12 entries per task run: 2 type * 2 users * 3 hosts, so this is 36 runs, or 6 hours.
    size: 432
  };

  return queryLoggly(md5SearchOptions)
    .then(parseMD5Entries);

}

// TODO(daneroo) include latest stamp information
// convenience to be run from task.
// run the query, detection and log it!
function detectMismatchTask() {
  return getMD5Records()
    .then(detectMismatch);
}

// Simply logs as error, which sends it back to loggly
// This detects if hash signatures match across reporting hosts, for each user/type
//  ignore stamps for now, just compare latests
function detectMismatch(records) {
  // find the latest entry (first if we assume desc stamp order)
  // for each user/type combination
  var latestForUserTypeThenHost = records.reduce((result, record) => {
    var userType = JSON.stringify({
      user: record.user,
      type: record.type
    });
    var host = record.host;
    result[userType] = result[userType] || {};
    // don't overwrite, since we want the latest, and assume descending stamp ordering
    if (!result[userType][host]) {
      result[userType][host] = record.md5;
    }
    return result;
  }, {});
  // console.log(latestForUserTypeThenHost);

  var anyFailures = false;
  _.forEach(latestForUserTypeThenHost, (byHost, userType) => {
    // byHost is the map of md5 for each host (for the current userType)
    var allMatch = _.uniq(_.values(byHost)).length === 1;
    if (!allMatch) {
      anyFailures = true;

      var shortByHost = _.reduce(byHost, function (result, md5, host) {
        host = host.split('.')[0];
        md5 = md5.substr(0, 7)
        result[host] = md5;
        return result;
      }, {});

      var describe = _.merge(JSON.parse(userType), shortByHost);
      log.warn('logcheck signature mismatch', describe);
    }
  });
  if (!anyFailures) {
    var hostCount = _.size(_.countBy(records, r => r.host));
    log.info('logcheck signature matches confirmed', {
      hostCount: hostCount,
      logRecords: records.length
    });
  }
  // return for the promise chain
  return records;
}

// This function uses the node-loggly module directly, instead of winston-loggly
// This makes this module more independant.
function queryLoggly(searchOptions) {
  return new Promise(function (resolve, reject) {
    client.search(searchOptions)
      .run(function (err, results) {
        if (err) {
          // the error object doesn't work with loggly, convert to string to send
          log.error('logcheck.query: %s', err);
          reject(err);
        } else {
          log.verbose('logcheck.query', {
            fetched: results.events.length,
            total_events: results.total_events
          });
          resolve(results.events);
        }
      });
  });
}

// receives loggly entries for history-md5,
//   jsonl.write file=history-daniel-podcast.json, md5=0c4507e...
// and returns an array of {stamp,host,user,type,md5}
function parseMD5Entries(entries) {
  var records = [];

  entries.forEach(function (entry) {
    // stamp is no longer rounded here: moved to aggregator function
    var stamp = new Date(entry.timestamp).toJSON();

    // get user,type e.g.: file=history-daniel-podcast.json
    var file = entry.event.json.file;
    var parts = file.replace(/\.json$/, '').split('-');
    // confirm part[0]===history
    if (parts.length !== 3) {
      log.warn('logcheck: skipping entry', {
        stamp: stamp,
        file: file
      });
    }
    var user = parts[1];
    var type = parts[2];

    // host from tags: [ 'pocketscrape', 'host-darwin.imetrical.com' ]
    var host = _.filter(entry.tags, tag => tag.match(/^host-/))[0].replace(/^host-/, '');

    var record = {
      stamp: stamp,
      host: host,
      user: user,
      type: type,
      md5: entry.event.json.md5
    };

    records.push(record);
  });
  return records;
}
