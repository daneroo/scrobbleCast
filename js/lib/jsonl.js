'use strict'

// TODO split into testable components

// dependencies - core-public-internal
// for fs.readdirPromise
var Promise = require('bluebird')
var fs = Promise.promisifyAll(require('fs'), {
  suffix: 'Promise'
})
var path = require('path')
var mkdirp = require('mkdirp')
var log = require('./log')
var utils = require('./utils')

// used to make and parse json for reading and writing to files either in .json, or .jsonl format
exports = module.exports = {
  read: read,
  write: write
}

// TODO: make these Async/Promised
// TODO: make this read gzipped extensions
// TODO: validate if filename has md5 signature

function read (file) {
  if (file.match(/\.jsonl/)) {
    return readLines(file)
  }
  var result = JSON.parse(fs.readFileSync(file))
  // this should be depreacted:
  if (result.episodes || result.podcasts) {
    log.warn('jsonl.read: deprecated casting', {
      result: result
    })
  }
  return result.episodes || result.podcasts || result
}

function readLines (file) {
  var lines = fs.readFileSync(file, 'utf8').toString().split('\n')
  // filter for empty lines
  lines = lines.filter((line) => {
    return line.trim().length > 0
  })
  for (var i in lines) {
    lines[i] = JSON.parse(lines[i])
  }
  return lines
}

// write .json/.jsonl depending on filename
// verbose, will log the action
function write (filename, items, verbose) {
  var json = makeJSON(filename, items)
  var dir = path.dirname(filename)
  mkdirp.sync(dir)
  fs.writeFileSync(filename, json)
  if (verbose) {
    var numItems = (items.length) ? items.length : 1
    // TODO(daneroo): reset to info; verbose to avoid loggly for now
    log.verbose('jsonl.write', {
      file: path.basename(filename),
      md5: utils.md5(json),
      n: numItems,
      MB: (json.length / 1024 / 1024).toFixed(2)
    })
  }
}

// TODO(daneroo) make typed, instead of switching on filename
// utility function to write json, or jsonl, depending on filename extension
function makeJSON (filename, items) {
  var json
  if (filename.match(/\.jsonl$/)) {
    if (!Array.isArray(items)) {
      var msg = 'jsonl.makeJSON:items is not an array'
      log.error(msg, {
        file: filename
      })
      throw new Error(msg)
    }
    var lines = []
    items.forEach(function (el) {
      lines.push(JSON.stringify(el))
    })
    json = lines.join('\n')
  } else {
    json = JSON.stringify(items, null, 2)
  }
  return json
}
