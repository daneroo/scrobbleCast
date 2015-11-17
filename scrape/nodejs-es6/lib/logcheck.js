'use strict';

// This abstracts querying the loggly endpoint
// this allows us to coordinate/and compare the logging output from many running clients

// dependencies - core-public-internal
var fs = require('fs');
var winston = require('winston');
var loggly = require('../node_modules/winston-loggly/node_modules/loggly');
var _ = require('lodash');
var Table = require('cli-table');
var log = require('./log');

exports = module.exports = {
  query: queryLoggly
};

var config = JSON.parse(fs.readFileSync('credentials.loggly.json').toString());
var client = loggly.createClient(config);

function queryLoggly(callback) {
  client.search({
      // fields:['message'],
      query: 'md5',
      from: '-24h',
      until: 'now',
      size: 1500,
      // rows: 1 // no effect
    })
    .run(function(err, results) {
      if (err) {
        console.log(err);
      } else {
        // Inspect the result set
        // results.events = results.events.length;
        console.dir(results);
        log.verbose('logcheck.query', {
          found: results.events.length,
          page: results.page,
          total_events: results.total_events
        });
        callback(results.events);
      }
    });

}

function queryWinstonLoggly(callback) {
  var options = {
    from: new Date() - 24 * 60 * 60 * 1000,
    until: new Date(),
    size: 200, // just to prove this works!, default is 50
    order: 'desc',
    query: 'tag:pocketscrape AND json.md5 json.file:history-*'
  };
  winston.query(options, function(err, results) {
    if (err) {
      throw err;
    }
    log.verbose('logcheck.query', {
      found: results.loggly.events.length,
      page: results.loggly.page,
      total_events: results.loggly.total_events
    });
    callback(results.loggly.events);
  });

}
