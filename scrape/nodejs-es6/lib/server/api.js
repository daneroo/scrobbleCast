'use strict';

// dependencies - core-public-internal
const express = require('express');
const cors = require('cors');
const log = require('../log');
const store = require('../store');

const router = express.Router();

module.exports = router;
// Middleware
// CORS
router.use(cors());

// TODO(daneroo): authentication
router.use(function authMiddleware(req, res, next) {
  log.verbose('-api: should be auth\'d');
  next();
});

// define the home page route
router.get('/', function (req, res) {
  res.send('API Home');
});
// define the about route
router.route('/digests')
  .get(function (req, res) {
    store.impl.pg.digests()
      .then((rows) => {
        res.json(rows)
      })
      .catch((err) => {
        res.send(err);
      });

  });
// .post(function (req, res) {
//   // This is where we add...
// });

router.route('/digest/:digest')
  .get(function (req, res) {
    const digest = req.params.digest;
    log.verbose('/api/digest/', digest);
    store.impl.pg.getByDigest(digest)
      .then((item) => {
        res.json(item)
      })
      .catch((err) => {
        res.send(err);
      });

  });
    // .put(function(req, res) {
    // })


