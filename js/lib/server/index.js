'use strict'

// This was brought over from instapool.
// TODO(daneroo): proper error handling: https://github.com/B1naryStudio/express-api-response
// OR move to http://restify.com/

// dependencies - core-public-internal
const path = require('path')
const express = require('express')
const morgan = require('morgan')
const config = require('../config')
const log = require('../log')
const api = require('./api')

// express init
const app = express()
const server = require('http').createServer(app)

app.use(morgan('tiny', { // dev has color - we really want structured logging
  skip: function (req /*, res */) {
    return req.url === '/metrics'
  },
  stream: log.morganStream
}))

app.use('/api', api)

// static app
app.use(express.static(path.join(__dirname, 'public')))

function start () {
  server.listen(config.express.port, function () {
    log.info('Express server listening on port *:' + config.express.port)
  })
}
exports = module.exports = {
  start
}
