'use strict'

// TODO split into testable components

// dependencies - core-public-internal
// for fs.readdirPromise
const Promise = require('bluebird')
const fs = Promise.promisifyAll(require('fs'), {
  suffix: 'Promise'
})
const path = require('path')
const mkdirp = require('mkdirp')
const log = require('./log')
const utils = require('./utils')

// used to make and parse json for reading and writing to files either in .json, or .jsonl format
exports = module.exports = {
  read,
  write
}

// TODO: make these Async/Promised
// TODO: make this read gzipped extensions
// TODO: validate if filename has md5 signature

function read (file) {
  if (file.match(/\.jsonl/)) {
    return readLines(file)
  }
  const result = JSON.parse(fs.readFileSync(file))
  // this should be depreacted:
  if (result.episodes || result.podcasts) {
    log.warn('jsonl.read: deprecated casting', {
      result
    })
  }
  return result.episodes || result.podcasts || result
}

function readLines (file) {
  let lines = fs.readFileSync(file, 'utf8').toString().split('\n')
  // filter for empty lines
  lines = lines.filter((line) => {
    return line.trim().length > 0
  })
  for (const i in lines) {
    lines[i] = JSON.parse(lines[i])
  }
  return lines
}

// write .json/.jsonl depending on filename
// verbose, will log the action
function write (filename, items, verbose) {
  const json = makeJSON(filename, items)
  const dir = path.dirname(filename)
  mkdirp.sync(dir)
  fs.writeFileSync(filename, json)
  if (verbose) {
    const numItems = (items.length) ? items.length : 1
    // TODO(daneroo): reset to info; verbose to avoid loggly for now
    log.info('jsonl.write', {
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
  let json
  if (filename.match(/\.jsonl$/)) {
    if (!Array.isArray(items)) {
      const msg = 'jsonl.makeJSON:items is not an array'
      log.error(msg, {
        file: filename
      })
      throw new Error(msg)
    }
    const lines = []
    items.forEach(function (el) {
      lines.push(JSON.stringify(el))
    })
    json = lines.join('\n')
  } else {
    json = JSON.stringify(items, null, 2)
  }
  return json
}
