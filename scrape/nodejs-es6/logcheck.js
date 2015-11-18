'use strict';

// dependencies - core-public-internal
var _ = require('lodash');
var Table = require('cli-table');
var colors = require('colors/safe'); // don't touch String prototype
var log = require('./lib/log');
var logcheck = require('./lib/logcheck');

log.verbose('Starting LogCheck');

//
// Find items logged between today and yesterday.
//
logcheck.getMD5Records()
  // .then(showRecords) // show raw data
  .then(aggRecords)
  .then(function(records) {
    log.verbose('records:%s', records.length);
    return records;
  })
  .catch(function(error) {
    log.error('logcheck: %s', error);
  });

// TODO(daneroo) refactor some more
// put the aggregation and data production into lib, but not the table stuff
// TODO(daneroo) in the unlikely event that more than one value is present for the same stamp,
//   we might want to ensure we have the latest value... (assume or ensure sort order)
//   e.g. break one, and resubmit with manual dedup.
// TODO(daneroo) what if we have -no value- in comparison

// group by stamp rounded to 10min
// deduplicate, or find first match
// this function assumes that incoming records are descending
function aggRecords(records) {
  // records.reverse();
  var types = distinct(records, 'type'); //.reverse();
  var users = distinct(records, 'user'); // these are sorted
  var hosts = distinct(records, 'host'); // these are sorted

  function emptyHostMap() { // function bound to hosts, which is an array
    return _.reduce(hosts, function(result, value, key) {
      result[value] = '-no value-';
      return result;
    }, {});
  }

  // map [{stamp, host, user, type, md5}] - array of obj
  // to [[ stamp, host1-md5,.. hostn-md5]] - array of arrays
  // first filtering for a specific user and type
  function makeTableStampByHost(u, t) { // function is bound to records
    var md5byStampByHost = {};
    _(records).filter({
      user: u,
      type: t
    }).each(function(r) {
      var stamp = r.stamp;
      // stamp is rounded to 10min so we can match entries.
      stamp = stamp.replace(/[0-9]:[0-9][0-9](\.[0-9]*)?Z$/, '0:00Z'); // round down to 10:00

      md5byStampByHost[stamp] = md5byStampByHost[stamp] || emptyHostMap();
      //TODO(daneroo) prevent overwrite - if we assume descending order.
      md5byStampByHost[stamp][r.host] = r.md5;
    });

    var rows = [];
    // keep the table in reverse chronological order
    _.keys(md5byStampByHost).sort().reverse().forEach(function(stamp) {
      var row = [stamp];
      _.keys(md5byStampByHost[stamp]).sort().forEach(function(host) {
        var md5 = md5byStampByHost[stamp][host];
        row.push(md5);
      });
      rows.push(row);
    });
    return rows;
  }

  types.forEach(function(t) {
    users.forEach(function(u) {
      var rows = makeTableStampByHost(u, t);

      // reformat
      rows = rows.map(row => {
        // adjust the output each row in stamp, md5,md5,..
        return row.map((v, idx) => {
          if (idx === 0) {
            // return v.substr(11,5); // too short
            return v;
          }
          return v.substr(0, 7); // a la github
        });
      });

      // keep only until first match
      var foundIdentical = false;
      rows = rows.filter((row) => {
        // is all md5's are equal (1 distinct vale)
        if (!foundIdentical && _.uniq(row.slice(1)).length === 1) {
          foundIdentical = true;
          row[0] = colors.green(row[0]);
          return true;
        }
        return !foundIdentical;
      });

      // now the ouput - as table
      var shortHosts = hosts.map(host => {
        return host.split('.')[0];
      });
      var header = [u + '-' + t].concat(shortHosts);
      var table = newTable(header);
      rows.forEach(row => {
        table.push(row);
      });
      console.log(table.toString());
    });
  });

  return records;
}

function distinct(records, field) {
  var values = {};
  records.forEach(function(r) {
    var value = r[field];
    values[value] = true;
  });
  return Object.keys(values).sort();
}

// Just print th records in a table, possible elipse to remove middle rows...
function showRecords(records) {
  var origRecords = records; // needs to be returned to the promise chain
  if (!records || !records.length) {
    return origRecords;
  }

  var ellipsis = false;
  var howMany = 3;
  if (ellipsis && records.length > (howMany * 2)) {
    var dotdotdot = blankedObject(records[0], '.');
    records = records.slice(0, howMany).concat(dotdotdot, records.slice(-howMany));
  }

  var table = newTable(['stamp', 'host', 'user', 'type', 'md5']);
  records.forEach(function(r) {
    var record = [r.stamp, r.host, r.user, r.type, r.md5];
    table.push(record);
  });
  console.log(table.toString());
  return origRecords;
}

// Utility to create an object with same keys, but default values
function blankedObject(obj, defaultValue) {
  defaultValue = defaultValue === undefined ? '' : defaultValue;
  return _.reduce(obj, function(result, value, key) {
    result[key] = defaultValue;
    return result;
  }, {});
}

// Utility to create our formatted table
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
