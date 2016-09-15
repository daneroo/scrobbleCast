'use strict';

// dependencies - core-public-internal
var path = require('path');
var express = require('express');
var morgan = require('morgan');

var log = require('../log');
var config = require('../config');
var metrics = require('../metrics');

// express/socket.io init
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server);

app.use(morgan('tiny', { // dev has color - we really want structured logging
  skip: function (req /*, res */) {
    return req.url === '/metrics';
  },
  stream: log.morganStream
}));

// Instrument for prometheus
app.get('/metrics', metrics.prometheus.metricsFunc());

// static app
app.use(express.static(path.join(__dirname, 'public')));

io.on('connection', function (socket) {
  io.emit('info', {
    msg: 'user connected'
  });
  socket.on('disconnect', function () {
    io.emit('info', {
      msg: 'user disconnected'
    });
  });
});

// Inject socket.io into metrics
metrics.setSockio(io);

function start() {
  server.listen(config.express.port, function () {
    log.info('Express server listening on port *:' + config.express.port);
  });

}
exports = module.exports = {
  start: start
};
