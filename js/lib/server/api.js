'use strict'

// dependencies - core-public-internal
const express = require('express')
// // const compression = require('compression')
const cors = require('cors')
const log = require('../log')
const store = require('../store')
const config = require('../config')

const router = express.Router()

module.exports = router
// Middleware
// CORS
router.use(cors())

// Middleware
// support for Compression (Accept-Encoding: gzip|deflate)
// as shown by: curl -i -H 'Accept-Encoding: deflate' http://0.0.0.0:8000/api/digests | wc
// TODO(daneroo): re-enable, causing Z_BUF_ERROR for now, might try putting on app.use()
// router.use(compression())

// TODO(daneroo): authentication
router.use(function authMiddleware (req, res, next) {
  log.verbose('-api: should be auth\'d')
  next()
})

// define the home page route
router.get('/', function (req, res) {
  res.send('API Home')
})

router.get('/version', function (req, res) {
  res.json(config.version)
})

// expose /status, possible to aid in synch'ing, or even peer checkpionting
router.get('/status', function (req, res) {
  res.json({
    stamp: new Date().toISOString(), // for checking clock sync
    tasks: { // active, and recently completed...
    },
    sync: { } // checkpoints for peers with stamps (+ recent if not synch'd)
  })
})

// define the digests route
router.route('/digests')
  .get(function (req, res) {
    let syncParams = req.query // pass on the query params to pg.digests
    store.db.digests(syncParams)
      .then((rows) => {
        res.json(rows)
      })
      .catch((err) => {
        log.info('digests error', err)
        // TODO(daneroo): Errors: https://kostasbariotis.com/rest-api-error-handling-with-express-js/
        res.status(500).json({
          name: 'Error',
          message: 'The digests could not be listed',
          statusCode: 500,
          errorCode: 500 // could be app specific
        })
      })
  })
// .post(function (req, res) {
//   // This is where we add...
// });

router.route('/digest/:digest')
  // .put(function(req, res) {
  // })
  .get(function (req, res) {
    const digest = req.params.digest
    log.verbose('/api/digest/', digest)
    store.db.getByDigest(digest)
      .then((item) => {
        res.json(item)
      })
      .catch((err) => {
        log.info('getByDigest error', err)
        // TODO(daneroo): Errors: https://kostasbariotis.com/rest-api-error-handling-with-express-js/
        res.status(404).json({
          name: 'notFound',
          message: 'The item could not be found',
          statusCode: 404,
          errorCode: 404 // could be app specific
        })
      })
  })
