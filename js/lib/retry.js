'use strict'

// This script is simple wrapper around `request-promise`
// It is meant to encapsulate these functionanlities:
//   -error handling
//   -logging/debugging
//   -retry behaviour

// dependencies - core-public-internal

var rp = require('request-promise')

// good place to figure out logging: config,category,level (fatal..debug), args
// var log = console.log;
var log = function () {} // no logging

// We are only using request promise with a single argument
function retry (arg) {
  // log('*****************', JSON.stringify(arg));
  var M = arg.method || 'GET'
  var U = arg.uri.replace('https://play.pocketcasts.com', '')
  var X = arg.headers ? arg.headers['X-XSRF-TOKEN'] : 'NO-TOKEN'
  var start = +new Date()
  // log('----------', M, U, X);
  return rp(arg)
    .then(function (response) {
      return response
    })
    .catch(function (error) { // error: {error:,options,response,statusCode}
      // look for specific errors: 302,TIMEOUT, Authentication Failure
      // log('--------+E', M, U, X,error);
      throw error
    })
    .finally(function () {
      var ms = +new Date() - start
      log('--------++', M, U, X, ms, 'ms')
    })
  // could hadle errors here (log,handle(302),rethrow,retry)
}

// Exported API
exports = module.exports = retry
