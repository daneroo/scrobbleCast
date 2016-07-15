'use strict';

// pg basics - setup pool, ddl, utility funcs

// dependencies - core-public-internal
var Promise = require('bluebird');
// var _ = require('lodash');
// Taken from postgress-bluebird
var pg = require('pg');
Promise.promisifyAll(pg.Client.prototype);
Promise.promisifyAll(pg.Client);
Promise.promisifyAll(pg.Connection.prototype);
Promise.promisifyAll(pg.Connection);
Promise.promisifyAll(pg.Query.prototype);
Promise.promisifyAll(pg.Query);
Promise.promisifyAll(pg);
// TODO(daneroo): promisify pools
var log = require('../log');

// Exported API
exports = module.exports = {
  query: query, // (sql,values) => Promise
  insert: insert, // (sql,values) => Promise
  init: init, // return Promise(bool?)
  end: end // drain the pool! Doesn't loook async (pg.end has no cb.)
};

function end() {
  log.debug('pgu:end Closing connections, drain the pool!');
  pg.end();
}

// TODO(daneroo): move to config
// var connectionString = 'postgres://docker:5432@localhost/postgres';
// var connectionString = 'postgres://postgres@docker/scrobblecast';
var connectionString = 'postgres://postgres@localhost/scrobblecast';
var client;

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
        // log.debug('result', result);
        return result.rowCount;
      })
      .finally(release);
  });
}

function ddlSilent(ddl) {
  return query(ddl)
    .catch(function(error) {
      log.verbose('silently caught %s', error.message);
    });
}

function init() {
  return query('select 42 as answer')
    .then(function(result) {
      log.debug('%j', result);
    })
    .then(function() {
      var ddl = [
        'CREATE TABLE items ( ',
        '__user varchar(255), ',
        '__stamp timestamp with time zone, ',
        '__type varchar(255), ',
        'uuid  varchar(255), ',
        '__sourceType varchar(255), ',
        'item json, ',
        // 'CONSTRAINT primary_idx PRIMARY KEY(__user, __stamp, __type, uuid, __sourceType) ',
        'CONSTRAINT primary_idx PRIMARY KEY(__user, __type, uuid, __sourceType, __stamp) ',
        ')'
      ].join('');
      return ddlSilent(ddl);
    })
    .then(function() {
      var ddl = 'create extension pgcrypto';
      return ddlSilent(ddl);
    })
    // .then(function () {
    //   // was used for a lookup by digest: confirmIdenticalByDigestCount
    //   var ddl = 'CREATE INDEX digest_idx ON items (encode(digest(item::text, \'sha256\'), \'hex\'))';
    //   return ddlSilent(ddl);
    // })
    .then(function(rows) {
      // throw new Error('Early exit');
    });

}
