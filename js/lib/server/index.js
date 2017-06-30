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
const metrics = require('../metrics')
const api = require('./api')

// express/socket.io init
const app = express()
const server = require('http').createServer(app)
const io = require('socket.io')(server)

app.use(morgan('tiny', { // dev has color - we really want structured logging
  skip: function (req /*, res */) {
    return req.url === '/metrics'
  },
  stream: log.morganStream
}))

// Instrument for prometheus
app.get('/metrics', metrics.prometheus.metricsFunc())

app.use('/api', api)

// static app
app.use(express.static(path.join(__dirname, 'public')))

// Socket.io below

io.on('connection', function (socket) {
  io.emit('info', {
    msg: 'user connected'
  })
  socket.on('disconnect', function () {
    io.emit('info', {
      msg: 'user disconnected'
    })
  })
})

// Inject socket.io into metrics
metrics.setSockio(io)

function start () {
  server.listen(config.express.port, function () {
    log.info('Express server listening on port *:' + config.express.port)
  })
}
exports = module.exports = {
  start: start
}
