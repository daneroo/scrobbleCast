'use strict';

// dependencies - core-public-internal
// var Promise = require('bluebird');
var log = require('./lib/log');
var winston = require('winston');
var _ = require('lodash');
log.verbose('Starting LogCheck');

// defaults
// context.from  = context.from  || '-1d';
// context.until = context.until || 'now';
// context.size  = context.size  || 50;

var maxPage = 0;

function getPage(page, callback, events) {
  events = events || [];
  var options = {
    from: new Date() - 1 * 60 * 60 * 1000,
    until: new Date(),
    limit: 50,
    start: page,
    order: 'desc',
    query: 'tag:pocketscrape AND json.md5 json.file:history-*',
    fields: ['message']
  };
  winston.query(options, function(err, results) {
    if (err) {
      throw err;
    }
    prettylog({
      totalSoFar: events.length,
      added: results.loggly.events.length,
      page: results.loggly.page,
      total_events: results.loggly.total_events
    });
    events = events.concat(results.loggly.events);
    if (page >= maxPage) {
      callback(events);
    } else {
      getPage(page + 1, callback, events);
    }
  });

}

//
// Find items logged between today and yesterday.
//
getPage(0, function(events) {
  var records = [];
  // var events = results.loggly.events;

  // delete results.loggly.events;
  // prettylog(results);

  // events.reverse();
  events.forEach(function(entry) {
    entry = _.pick(entry, ['timestamp', 'tags', 'event']);
    entry.event = _.pick(entry.event, ['json']);
    var parts = entry.event.json.file.replace(/\.json$/, '').split('-');
    if (parts.length === 3) {
      entry.event.json.user = parts[1];
      entry.event.json.type = parts[2];
    }

    var stamp = new Date(entry.timestamp).toJSON();
    stamp = stamp.substr(11, 8); // just the time
    stamp = stamp.replace(/[0-9]:[0-9][0-9]$/, '0:00'); // round down to 10:00
    var host = _.filter(entry.tags, tag => tag.match(/^host-/))[0].replace(/^host-/, '');
    // host = host.split('.')[0]; // basename
    var record = {
      stamp: stamp,
      host: host,
      user: entry.event.json.user,
      type: entry.event.json.type,
      md5: entry.event.json.md5.substr(0, 7),
    };

    records.push(record);
    // prettylog(entry);
    // console.log(JSON.stringify(record));
  });

  showRecords(records);
  aggRecords(records);
  log.verbose('results:%s', events.length);

});

function aggRecords(records) {
  // return;
  var types = distinct(records, 'type').reverse();
  var users = distinct(records, 'user');
  var hosts = distinct(records, 'host');

  function emptyHostMap() {
    return _.reduce(hosts, function(result, value, key) {
      result[value] = '';
      return result;
    }, {});
  }

  types.forEach(function(t) {
    users.forEach(function(u) {
      var md5byStampByHost = {};
      _(records).filter({
        user: u,
        type: t
      }).each(function(r) {
        md5byStampByHost[r.stamp] = md5byStampByHost[r.stamp] || emptyHostMap();
        md5byStampByHost[r.stamp][r.host] = r.md5;
      });
      var table = newTable([u + '-' + t].concat(hosts));
      _.forEach(md5byStampByHost, function(dummy, stamp) {
        var row = [stamp];
        _.forEach(md5byStampByHost[stamp], function(md5) {
          row.push(md5);
        });
        table.push(row);
      });
      console.log(table.toString());
    });
  });
}

function distinct(records, field) {
  var values = {};
  records.forEach(function(r) {
    var value = r[field];
    values[value] = true;
  });
  return Object.keys(values);
}

function showRecords(records) {
  records = records.slice(0, 2).concat(records.slice(-2));

  var table = newTable();
  records.forEach(function(r) {
    var record = [r.stamp, r.host, r.user, r.type, r.md5];
    table.push(record);
  });
  console.log(table.toString());

}

function newTable(head) {
  var Table = require('cli-table');
  // var table = new Table();
  var table = new Table({
    head: head || [],
    chars: {
      'mid': '',
      'left-mid': '',
      'mid-mid': '',
      'right-mid': ''
    }
  });
  return table;
}

function prettylog(o) {
  console.log(JSON.stringify(o, null, 2));
}
