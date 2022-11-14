'use strict'

// dependencies - core-public-internal
// var fs = require('fs');
// for fs.readdirPromise
const Promise = require('bluebird')
const fs = Promise.promisifyAll(require('fs'), {
  suffix: 'Promise'
})
const path = require('path')
const _ = require('lodash')
const log = require('../log')
const utils = require('../utils')
// unfortunate but nee loadJSON for parsing .jsonl, for overwrite verification
const jsonl = require('../jsonl')

// globals - candidate for config
const dataDirname = 'data'

// items => <__user>/<__stamp>/__sourceType[-<podast_uuid>].json
// items should not be empty
// assert common parts common to all titems
function pathForItems (items) {
  // take first element as representative
  const item = items[0]
  const keys = {
    __user: item.__user,
    __stamp: item.__stamp,
    __sourceType: item.__sourceType
  }

  if (item.__sourceType === '02-podcasts') {
    keys.podcast_uuid = item.podcast_uuid
  }

  // assertions - for keys
  _.keys(keys).forEach(function (key) {
    if (!keys[key]) {
      console.log('pathForItems: missing key: ' + key)
      console.log('keys', keys)
      throw new Error('pathForItems: missing key: ' + key)
    }
  })

  // assertions - all items have same key elements - using lodash where notation
  if (!_.every(items, keys)) {
    console.log('keys', keys)
    throw new Error('pathForItems: nonuniform key items.')
  }

  const paths = [keys.__user, keys.__stamp]
  if (keys.podcast_uuid) {
    paths.push(keys.__sourceType + '-' + keys.podcast_uuid)
  } else {
    paths.push(keys.__sourceType)
  }

  return paths.join('/')
}

// This was originally called: verifyIdenticalOrWrite
// -Verifies file does not exist or content is same as original
// -Validates by default (overwrite protection)
// options:
//  overwrite:bool allow overwriting of file with different content default:false
//  log:bool print the md5,size and line count default:false
// TODO(daneroo) options: pretty=true, gzip=true, sign=true
function write (filename, items, opts) {
  opts = _.merge({
    overwrite: false,
    log: false
  }, opts)

  let msg
  // skip verification if opts.overwrite:true
  if (!opts.overwrite && fs.existsSync(filename)) {
    const olditems = jsonl.read(filename)
    if (!utils.isEqualWithoutPrototypes(olditems, items)) {
      jsonl.write('bad-olditems.json', olditems)
      jsonl.write('bad-newitems.json', items)
      msg = 'sink.file.write: verify identical: overwrite prevented'
      log.error(msg, {
        file: filename,
        opt: opts
      })
      if (utils.hasSameContent(olditems, items)) {
        log.error('sink.file.write: verify identical: samecontent policy would have allowed it')
        // uncomment the next two lines to have the 'samecontent'' behavior
        // jsonl.write(filename, items, opts.log);
        // return;
      }

      throw new Error(msg)
    } else {
      if (opts.log) {
        msg = 'sink.file.write: overwrite verified identical'
        log.verbose(msg, {
          file: path.basename(filename)
        })
      }
    }
  } else {
    jsonl.write(filename, items, opts.log)
  }
}

// write byUserStamp
// write a collection of items into a json file
// basepath default is dataDirname
// - <basepath>/byUserStamp/<__user>/<__stamp>/__sourceType[-<podast_uuid>].json
function writeByUserStamp (items, basepath) {
  if (!items || !items.length) {
    log.verbose('writeByUserStamp: nothing to write')
    return
  }
  basepath = basepath || dataDirname

  const basename = pathForItems(items)

  const filename = path.join(basepath, 'byUserStamp', [basename, 'json'].join('.'))

  // could turnoff verification
  write(filename, items)
}

// TODO: change API to .read/.write
exports = module.exports = {
  dataDirname,
  write,
  writeByUserStamp
}
