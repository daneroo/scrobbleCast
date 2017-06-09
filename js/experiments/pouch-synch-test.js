var Promise = require('bluebird')
var PouchDB = require('pouchdb')
var _ = require('lodash')

var a = {
  _id: 'a',
  stamp: new Date().toJSON()
}
var b = {
  _id: 'b',
  stamp: new Date().toJSON()
}

var author = Math.floor(Math.random() * 1000) % 100 + 100

function insertOrUpdate (db, x) {
  x.author = author
  x.stamp = new Date().toJSON()
  return db.get(x._id)
    .then((doc) => {
      console.log('got %s: %j', x._id, doc)
      x._rev = doc._rev
      return db.put(x)
        .then((result) => {
          console.log('+put %j', result)
        })
    })
    .catch((err) => {
      if (err.status === 404) {
        return db.put(x)
          .then((result) => {
            console.log('-put %j', result)
          })
          .catch((err) => {
            console.log('put404, err: %j', err)
            throw err
          })
      } else {
        console.log('other err: %j', err)
        throw err
      }
    })
}

var dbnames = ['./testdb/db1', './testdb/db2']

function insThenSyncThenClose () {
  var me = (Math.random() < 0.5) ? 0 : 1
  var other = (me === 1 ? 0 : 1)
  var thisdb = dbnames[me]
  var db = new PouchDB(thisdb)

  return db.info()
    .then((result) => {
      console.log('db.info.count %s %j, seq:%s', thisdb, result.doc_count, result.update_seq)
    })
    .then(() => {
      return insertOrUpdate(db, a)
    })
    .then(() => {
      return insertOrUpdate(db, b)
    })
    .then(() => {
      var otherdb = new PouchDB(dbnames[other])
      return sync(db, otherdb)
        .then(() => {
          console.log('sync is done, closing')
          return otherdb.close()
        })
    })
    .then(() => {
      return db.close()
    })
    .then((/* result */) => {
      console.log('db1.close: ok')
    })
}

function sync (db1, db2) {
  return new Promise(function (resolve /*, reject */) {
    PouchDB.sync(db1, db2)
      .on('change', function (info) {
        // handle change
        console.log('sync:chg', _.omit(info, 'docs'))
      }).on('paused', function () {
        // replication paused (e.g. user went offline)
        console.log('sync:paused')
      }).on('active', function () {
        // replicate resumed (e.g. user went back online)
        console.log('sync:active')
      }).on('denied', function (info) {
        // a document failed to replicate, e.g. due to permissions
        console.log('sync:denied', info)
      }).on('complete', function (info) {
        // handle complete
        console.log('sync:complete', info)
        resolve(true)
      }).on('error', function (err) {
        // handle error
        console.log('sync:err', err)
      })
  })
}

function doit () {
  var d = Math.random() * 1000 + 5000
  console.log('delay', (d / 1000).toFixed(2))
  return Promise.delay(d)
    .then(() => {
      return insThenSyncThenClose()
    })
    .catch((err) => {
      console.log('Does the tesdb directory exist?')
      console.log('uncaught err: %j', err)
    })
}

const duration = 10000 // 0 for forever
doit()
const cancel = setInterval(doit, 5000)
setTimeout(() => {
  if (duration > 0) {
    clearInterval(cancel)
  }
}, duration)
