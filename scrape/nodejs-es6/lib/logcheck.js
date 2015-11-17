'use strict';

// This abstracts querying the loggly endpoint
// this allows us to coordinate/and compare the logging output from many running clients

// TODO(daneroo): Promisify

// dependencies - core-public-internal
var fs = require('fs');
var winston = require('winston');
var loggly = require('loggly');
var _ = require('lodash');
var Table = require('cli-table');
var log = require('./log');

exports = module.exports = {
  query: queryLoggly
};

var config = JSON.parse(fs.readFileSync('credentials.loggly.json').toString());
var client = loggly.createClient(config);

// The search option can be parametrized later, as params to query()
// but for now this has a single purpose.
var searchOptions = {
  query: 'tag:pocketscrape AND json.md5 AND json.file:history-*',
  from: '-24h',
  until: 'now',
  size: 1500,
};
// This function uses the node-loggly module directly, instead of winston-loggly
// This makes this module more independant.
function queryLoggly(callback) {
  client.search(searchOptions)
    .run(function(err, results) {
      if (err) {
        // the error object doesn't work with loggly, convert to string to send
        log.error('logcheck.query: %s',err);
      } else {
        log.verbose('logcheck.query', {
          found: results.events.length,
          total_events: results.total_events
        });
        callback(results.events);
      }
    });
}
