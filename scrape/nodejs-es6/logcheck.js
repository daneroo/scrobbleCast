'use strict';

// dependencies - core-public-internal
var _ = require('lodash');
var Table = require('cli-table');
var log = require('./lib/log');
var logcheck = require('./lib/logcheck');

log.verbose('Starting LogCheck');

//
// Find items logged between today and yesterday.
//
logcheck.getMD5Records()
  .then(function(records) {
    showRecords(records);
    aggRecords(records);
    log.verbose('records:%s', records.length);
  })
  .catch(function(error) {
    log.error('logcheck: %s', error);
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
  // records = records.slice(0, 2).concat(records.slice(-2));
  var dotdotdot = {
    stamp: '.',
    host: '.',
    user: '.',
    type: '.',
    md5: ','
  };
  records = records.slice(0, 2).concat(dotdotdot, records.slice(-2));
  var table = newTable(['stamp', 'host', 'user', 'type', 'md5']);
  records.forEach(function(r) {
    var record = [r.stamp, r.host, r.user, r.type, r.md5];
    table.push(record);
  });
  console.log(table.toString());

}

function newTable(head) {
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
