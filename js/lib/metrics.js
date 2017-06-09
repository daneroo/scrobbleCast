'use strict'

// TODO: make a function endpoint to do subsampling, add a guage for measured total rate
// subsampling because metrics become too important relative to queing for rabbit
// function push|pop(engine) => incr_by subsample

// dependencies - core-public-internal
var _ = require('lodash')
var Prometheus = require('prometheus-client')
var log = require('./log')

exports = module.exports = setup()

// Setup Prometheus return the exported structure
// wrapped in afunction so we can forward declare...
function setup () {
  var sockio = null
  var prometheus = new Prometheus()

  var namespace = 'instapool'

  // setter/getter for socket.io injection
  function setSockio (io) {
    sockio = io
    return sockio
  }

  // create on demand
  var helpByName = {
    // counters
    push_total: 'The number of jobs pushed to the queue.',
    pop_total: 'The number of jobs pulled from the queue.',
    // gauges
    queue_depth: 'The queue depth (length) at a given time.',
    batch_rate: 'Average queue processing rate over a batch run'
  }

  var countersByName = {}

  function getCounter (name) {
    var counter = countersByName[name]
    if (!counter) {
      log.info('Made a new Counter:', name)
      counter = prometheus.newCounter({
        namespace: namespace,
        name: name,
        help: helpByName[name] || name
      })
      countersByName[name] = counter
    }
    return counter
  }

  var gaugesByName = {}

  function getGauge (name) {
    var gauge = gaugesByName[name]
    if (!gauge) {
      log.info('Made a new Gauge:', name)
      gauge = prometheus.newGauge({
        namespace: namespace,
        name: name,
        help: helpByName[name] || name
      })
      gaugesByName[name] = gauge
    }
    return gauge
  }

  // counter increment {  name: engine: }
  // careful: destructive, removes name from opts.
  var sampleCount = 0

  function increment (opts, value) {
    value = value || 1
    var factor = 1
    sampleCount++
    if (sampleCount % factor === 0) {
      var counter = getCounter(opts.name)
      var optsNoName = _.omit(opts, 'name')
      counter.increment(optsNoName, value * factor)
    }
  }

  // gauge setter { value:, name:, engine:}
  // careful: we clone,remove name attr, (_.omit)
  // might be slow for high speed events
  function set (opts, value) {
    var gauge = getGauge(opts.name)
    var optsNoName = _.omit(opts, 'name')
    gauge.set(optsNoName, value)

    // emit the gauge value to socket.io
    if (sockio) {
      opts.value = value
      sockio.emit('gauge', opts)
    }
    // emit the gauge value to prometheus
  }

  return {
    prometheus: prometheus,
    setSockio: setSockio,
    increment: increment,
    set: set
  }
}
