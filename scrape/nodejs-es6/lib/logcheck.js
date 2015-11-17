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
  getMD5Records: getMD5Records
};

var config = JSON.parse(fs.readFileSync('credentials.loggly.json').toString());
var client = loggly.createClient(config);

function getMD5Records() {
  // The search options can be parametrized later (hours,runs...)
  var md5SearchOptions = {
    query: 'tag:pocketscrape AND json.md5 AND json.file:history-*',
    from: '-24h',
    until: 'now',
    // max size is about 1728=12*24*6, entiresPerRun*24h(retention) * 6runs/hour
    // at 12 entries per task run: 2 type * 2 users * 3 hosts, so this is 36 runs, or 6 hours.
    size: 60 //432
  };

  return queryLoggly(md5SearchOptions)
    .then(parseMD5Entries);

}

// This function uses the node-loggly module directly, instead of winston-loggly
// This makes this module more independant.
function queryLoggly(searchOptions) {
  return new Promise(function(resolve, reject) {
    client.search(searchOptions)
      .run(function(err, results) {
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

  // entries.reverse();
  entries.forEach(function(entry) {
    var stamp = new Date(entry.timestamp).toJSON();
    // stamp = stamp.substr(11); // just the time +Z
    stamp = stamp.replace(/[0-9]:[0-9][0-9](\.[0-9]*)?Z$/, '0'); // round down to 10:00, remove seconds

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
    host = host.split('.')[0]; // basename: remove .imetrical.com

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