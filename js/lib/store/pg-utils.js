'use strict'

// pg basics - setup pool, ddl, utility funcs

// dependencies - core-public-internal
var Promise = require('bluebird')
// var _ = require('lodash');
// Taken from postgress-bluebird
var pgp = require('pg-promise')({
  // init options ? move to config
  promiseLib: Promise
})
const config = require('../config')
const log = require('../log')

var db = pgp(config.postgres)

// Exported API
exports = module.exports = {
  db: db,
  getNamedParametersForItem: getNamedParametersForItem,
  insertSQL: insertSQL,
  // deprecated - use db?
  helpers: pgp.helpers,
  // lifecycle
  init: init, // return Promise(bool?)
  end: end // drain the pool! Doesn't loook async (pg.end has no cb.)
}

// support for insertSQL, getNamedParametersForItem only initialized once
const columns = [
  '__user',
  '__stamp',
  '__type',
  'uuid',
  // no camelCase! __sourceType -> __sourcetype
  '__sourcetype',
  'item'
]
const columnSet = new pgp.helpers.ColumnSet(columns, { table: 'items' })

// useful for generating an object for Named Parameter query arguments
// let nmParams = getNamedParametersForItem(item)
// db.any("select * from items where __user = ${__user} and uuid = ${uuid}",nmParams)
function getNamedParametersForItem (item) {
  return {
    __user: item.__user,
    __stamp: item.__stamp,
    __type: item.__type,
    uuid: item.uuid,
    // no camelCase! __sourceType -> __sourcetype
    __sourcetype: item.__sourceType,
    item: item
  }
}

// generates insert sql statement for one or many items
// if items is not an array, assume it is a single item
// uses pg-promise insert helper
function insertSQL (items) {
  let fields
  if (Array.isArray(items)) {
    fields = items.map(getNamedParametersForItem)
  } else {
    let item = items // just to clear on our intent
    fields = getNamedParametersForItem(item)
  }
  // this returns a (possibly mulitple) insert query
  return pgp.helpers.insert(fields, columnSet)
}

function ddlSilent (ddl) {
  return db.none(ddl)
    .catch(function (error) {
      log.verbose('silently caught %s', error.message)
    })
}

function init () {
  return db.one('select 42 as answer')
    .then(function (result) {
      log.verbose('init:test', result)
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
      ].join('')
      return ddlSilent(ddl)
    })
    .then(function () {
      var ddl = 'create extension pgcrypto'
      return ddlSilent(ddl)
    })
    .then(function () {
      // was used for a lookup by digest: confirmIdenticalByDigestCount
      var ddl = 'CREATE INDEX digest_idx ON items (encode(digest(item::text, \'sha256\'), \'hex\'))'
      return ddlSilent(ddl)
    })
}

async function end () {
  log.debug('pgu:end Closing connections, drain the pool!')
  return pgp.end()
}
