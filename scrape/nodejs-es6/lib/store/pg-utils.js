'use strict';

// pg basics - setup pool, ddl, utility funcs

// dependencies - core-public-internal
var Promise = require('bluebird');
// var _ = require('lodash');
// Taken from postgress-bluebird
var pgp = require('pg-promise')({
  // init options
  promiseLib: Promise
});
var log = require('../log');

// TODO(daneroo) move to global config
const config = {
  host: process.env.POSTGRES_HOST || 'localhost',
  port: 5432,
  // match ENV in docker-compose...
  database: 'scrobblecast',
  user: 'postgres'
  // password: null
};
var db = pgp(config);

// Exported API
exports = module.exports = {
  db: db,
  helpers: pgp.helpers,
  query: query, // (sql,values) => Promise
  insert: insert, // (sql,values) => Promise
  init: init, // return Promise(bool?)
  end: end // drain the pool! Doesn't loook async (pg.end has no cb.)
};

function end() {
  log.debug('pgu:end Closing connections, drain the pool!');
  pgp.end();
}

// just return result.rows, untils we need otherwise
function query(sql, values) {
  return db.any(sql, values)
    .then(function (result) {
      // console.log('pgu:query: result', result);
      return result;
    });
}

function insert(sql, values) {
  return db.none(sql, values)
    .then(function () {
      return 1;
    });
    // .catch(function (error) {
    //   log.error('pgu:insert:error ', error);
    //   return 0;
    // });
}

function ddlSilent(ddl) {
  return query(ddl)
    .catch(function (error) {
      log.verbose('silently caught %s', error.message);
    });
}

function init() {
  return query('select 42 as answer')
    .then(function (result) {
      log.verbose('%j', result);
    })
    .then(function () {
      var ddl = [
        'CREATE TABLE items ( ',
        '__user varchar(255), ',
        '__type varchar(255), ',
        'uuid  varchar(255), ',
        '__sourceType varchar(255), ',
        '__stamp timestamp with time zone, ',
        'item json, ',
        'CONSTRAINT primary_idx PRIMARY KEY(__user, __type, uuid, __sourceType, __stamp) ',
        ')'
      ].join('');
      return ddlSilent(ddl);
    })
    .then(function () {
      var ddl = 'create extension pgcrypto';
      return ddlSilent(ddl);
    })
    // .then(function () {
    //   // was used for a lookup by digest: confirmIdenticalByDigestCount
    //   var ddl = 'CREATE INDEX digest_idx ON items (encode(digest(item::text, \'sha256\'), \'hex\'))';
    //   return ddlSilent(ddl);
    // })
    .then(function (rows) {
      // throw new Error('Early exit');
    });

}
