'use strict';

// This utility will read all source files: extra=''
// and dunp them into postgres
// Object keys: user/type/uuid/stamp/

// dependencies - core-public-internal
var util = require('util');
var Promise = require('bluebird');
var utils = require('./lib/utils');
var srcFile = require('./lib/source/file');
var delta = require('./lib/delta');

// from postgress-bluebird
var pg = require('pg');
Promise.promisifyAll(pg.Client.prototype);
Promise.promisifyAll(pg.Client);
Promise.promisifyAll(pg.Connection.prototype);
Promise.promisifyAll(pg.Connection);
Promise.promisifyAll(pg.Query.prototype);
Promise.promisifyAll(pg.Query);
Promise.promisifyAll(pg);
// @todo promosify pools

// globals
var allCredentials = require('./credentials.json');

// var connectionString = 'postgres://docker:5432@localhost/postgres';
var connectionString = 'postgres://postgres@docker/scrobblecast';
var client;

//  move to logging module (?loggly)
var log = console.error;

Promise.resolve(true)
  .then(initDB)
  .then(main)
  .then(logMemAfterGC)
  .catch(verboseErrorHandler(false))
  .finally(function() {
    log('Done, done, releasing PG connection');
    pg.end(); // drain the pool!
  });

// just return result.rows, untils we need otherwise
function query(sql, values) {
  return pg.connectAsync(connectionString).spread(function(connection, release) {
    client = connection;
    return client.queryAsync(sql, values)
      .then(function(result) {
        // console.log('result', result);
        return result.rows;
      })
      .finally(release);
  });
}

function insert(sql, values) {
  return pg.connectAsync(connectionString).spread(function(connection, release) {
    client = connection;
    return client.queryAsync(sql, values)
      .then(function(result) {
        // console.log('result', result);
        return result.rowCount;
      })
      .finally(release);
  });
}

function ddlSilent(ddl) {
  return query(ddl)
    .catch(function(error) {
      log('silently caught %s', error.message);
    });
}

function initDB() {
  return query('select 42 as answer')
    .then(function(result) {
      log('%j', result);
    })
    .then(function() {
      var ddl = 'CREATE TABLE items ( __user varchar(255), __stamp timestamp with time zone, __type varchar(255), uuid  varchar(255), __sourceType varchar(255), item json )';
      return ddlSilent(ddl);
    })
    .then(function() {
      // var ddl = 'ALTER TABLE items ADD CONSTRAINT noduplicates UNIQUE (__user, __stamp, __type, uuid, __sourceType)';
      var ddl = 'ALTER TABLE items ADD UNIQUE (__user, __stamp, __type, uuid, __sourceType)';
      return ddlSilent(ddl);
    })
    .then(function(rows) {
      // throw new Error('Early exit');
    });

}

function main() {
  var extra = '';
  // var extra = 'rollup'; // to switch to rollup..
  return Promise.each(allCredentials, function(credentials) {
    logMemAfterGC();
    utils.logStamp('Restore started for ' + credentials.name);
    return restore(credentials, extra)
      .then(function() {
        return accumulateItems(credentials);
      });
  });
}

// returns all items from extra, in an array
function restore(credentials, extra) {
  return Promise.resolve(true);
  // shared handler for both extras
  var l = loader();
  var sharedHandler = l.handler;

  function reportCounts(counts) {
    Object.keys(counts).forEach(function(name) {
      var c = counts[name];
      var msg = util.format('base:%s user:%s |stamps|:%s |f|:%s |p|:%s |ignored|:%s', extra, name, c.stamp, c.file, c.part, c.ignoredFiles);
      utils.logStamp(msg);
    });
    return Promise.resolve(true);
  }

  // TODO: clean this up for final logic, with opts
  // this is the double iteration loader
  // return srcFile.iteratorWithRollup(extra, [credentials], sharedHandler, '**/*.json?(l)')
  return srcFile.iterator(extra, [credentials], sharedHandler, '**/*.json?(l)')
    .then(reportCounts);
}

// return an item handler for srcFile.iterator which:
// - reports item progress (moved to write logging)
// - validates increasing stamp order
// - acccumulates items in an {type:[items]} which is passed in.
// - writes out any completed months
function loader() {

  // throw error if item.__stamp's are non-increasing
  var maxStamp = '1970-01-01T00:00:00Z'; // to track increasing'ness
  function getMaxStamp() {
    return maxStamp;
  }

  function checkStampOrdering(item) {
    var stamp = item.__stamp;
    if (stamp < maxStamp) {
      log('Item stamp not increasing: %s > %j', maxStamp, item);
      throw new Error('Item stamp not increasing');
    }
    maxStamp = stamp;
  }

  var singleUser; // used to validate that all items have same user
  // validates that we are always called with a single user, throws on violation
  function checkUser(item) {
    // validate that all items are for same user
    if (!singleUser) {
      singleUser = item.__user;
    } else if (singleUser !== item.__user) {
      log('Mixing users in loader: %s != %s', singleUser, item.__user);
      throw new Error('Mixing users in loader');
    }
  }

  // the actual itemHandler being returned
  var handler = function itemHandler(credentials, stamp, file, item) {
    // throw error if item.__stamp's are non-increasing
    checkStampOrdering(item);
    // check that we are always called with same user
    checkUser(item);

    // save to database
    return saveItem(item);
  };

  return {
    handler: handler,
    getMaxStamp: getMaxStamp
  };
}

function accumulateItems(credentials) {
  console.log('accumulateitems for %s', credentials.name);
  return query('select item from items where __user=$1 order by __user,__stamp,__type,uuid,__sourceType', [credentials.name])
    .then(function(rows) {
      console.log('|rows|= %s', rows.length);
      var _user = credentials.name;
      var historyByType = new delta.AccumulatorByTypeByUuid();
      rows.forEach(function(row) {
        var item = row.item;
        var changeCount = historyByType.merge(item);
        if (changeCount === 0) {
          var msg = util.format('* Item Not deduped: %s %j', changeCount, item);
          utils.logStamp(msg);
          throw new Error(msg);
        }
      });
      log('Merged',rows.length);
      historyByType.sortAndSave(_user);
    });
}
//
// Save each item : problem, how do we traverse keys in an ordered way?
function saveItem(item) {
  function getFields(item) {
    return [item.__user, item.__stamp, item.__type, item.uuid, item.__sourceType, item];
  }

  var fields = getFields(item);
  // var key = fields.slice(0, -1).join('/');
  // console.log('-save', key);

  return insert('INSERT into items(__user,__stamp,__type,uuid,__sourceType,item) VALUES($1,$2,$3,$4,$5,$6)', fields)
    .then(function(rowCount) {
      if (rowCount !== 1) {
        console.log('insert rowCount', rowCount);
      }
    })
    .catch(function(err) {
      // todo check that values are equal...
      if (!err.message.startsWith('duplicate key')) {
        throw err;
      }
    });

}

// ************ Utilities

//  move to logging module (as Factory?)
function verboseErrorHandler(shouldRethrow) {
  return function errorHandler(error) {
    log('error', error);
    if (shouldRethrow) {
      throw (error);
    }
  };
}

function logMemAfterGC() {
  function showMem(pfx) {
    var msg = util.format('%sMem RSS: %sMB, Heap(t): %sMB, Heap(u): %sMB',
      pfx, (process.memoryUsage().rss / 1024 / 1024).toFixed(2), (process.memoryUsage().heapTotal / 1024 / 1024).toFixed(2), (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)
    );
    utils.logStamp(msg);
  }
  showMem('-');
  if (global.gc) {
    global.gc();
    global.gc();
    global.gc();
    global.gc();

    showMem('+');
  } else {
    utils.logStamp('  Garbage collection unavailable.  Pass --expose-gc when launching node to enable forced garbage collection.');
  }
  return Promise.resolve(true);
}
