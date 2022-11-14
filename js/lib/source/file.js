'use strict'

// dependencies - core-public-internal
// var fs = require('fs');
// for fs.readdirPromise
const Promise = require('bluebird')
const fs = Promise.promisifyAll(require('fs'), {
  suffix: 'Promise'
})
const path = require('path')
const log = require('../log')
const jsonl = require('../jsonl')

// a-la suffix: 'Promise'
const globPromise = Promise.promisify(require('glob'))

// globals - candidate for config
const dataDirname = 'data'

// dataDirname relative filename (internal)
function resolveData(file) {
  return path.resolve(dataDirname, file)
}

// this version is relative to dataDirname
function loadJSON(file) {
  return jsonl.read(resolveData(file))
}

// internal (for checking find's results)
function confirmSorted(files) {
  let sorted = true
  let lastFile
  files.forEach(function (file) {
    if (lastFile) {
      const ok = file >= lastFile
      if (!ok) {
        log.verbose('confirmSorted unexpected %s < %s', file, lastFile)
        sorted = false
      }
    }
    lastFile = file
  })
  if (!sorted) {
    const msg = 'files are not sorted'
    log.error(msg)
    throw new Error(msg)
  }
  return files
}

// get datestamps with fs.readdir on dataDirname/byUserStamp/user
// guaranteed to be sorted?
// basepath default is dataDirname
function findByUserStamp(user, basepath) {
  basepath = basepath || dataDirname
  // basepath default is dataDirname
  const dir = path.join(basepath, 'byUserStamp', user)
  return fs
    .readdirPromise(dir)
    .then(confirmSorted)
    .catch(function (err) {
      // log and rethrow
      console.log('findByUserStamp error:', err)
      throw err
    })
}

//  just break this into parts by Date
function find(pattern) {
  return globPromise(pattern, {
    cwd: dataDirname
  })
    .then(function (files) {
      // just for debugging
      // console.log('globPromise %s found: %d files', pattern, files.length);
      return files
    })
    .then(confirmSorted)
    .catch(function (err) {
      // log and rethrow
      console.log('globPromise error:', err)
      throw err
    })
}

// get datestamps with fs.readdir on dataDirname
// still used for toUserStamp
function findByDate() {
  return fs.readdirPromise(path.join(dataDirname, 'byDate'))
}

// traverse data directory. starting
function iterator(
  extrapath,
  allCredentials,
  callbackReturningPromise,
  pattern,
  fileFilter
) {
  pattern = pattern || '**/*.json'
  const basepath = path.join(dataDirname, extrapath)
  const counts = {}
  return Promise.each(allCredentials, function (credentials) {
    counts[credentials.name] = counts[credentials.name] || {
      part: 0,
      file: 0,
      stamp: 0,
      ignoredFiles: 0
    }
    const c = counts[credentials.name]
    return findByUserStamp(credentials.name, basepath).then(function (stamps) {
      return Promise.each(stamps, function (stamp) {
        return find(
          path.join(extrapath, 'byUserStamp', credentials.name, stamp, pattern)
        ).then(function (files) {
          c.stamp++
          return Promise.each(files, function (file) {
            if (fileFilter && !fileFilter(credentials, stamp, file)) {
              c.ignoredFiles++
              return Promise.resolve(true)
            }
            const items = loadJSON(file)
            c.file++
            return Promise.each(items, function (item) {
              c.part++
              return callbackReturningPromise(
                credentials,
                stamp,
                file,
                item,
                counts
              )
            })
          })
        })
      })
    })
  }).then(function () {
    return counts
  })
}

// 2015-11-06 Not yet used, first candidate is dedup.js
// call the iterator with extrapath='rollup'
// then call the iterator with passed extrapath for subsequent items (by date)
function iteratorWithRollup(
  extrapath,
  allCredentials,
  callbackReturningPromise,
  pattern,
  fileFilter
) {
  let maxStamp = '1970-01-01T00:00:00Z'

  // For the first invocation ('rollup')
  function wrapCallbackAndGrabDateHandler(
    credentials,
    stamp,
    file,
    item,
    counts
  ) {
    maxStamp = item.__stamp
    if (callbackReturningPromise) {
      return callbackReturningPromise(credentials, stamp, file, item, counts)
    }
    return Promise.resolve(true)
  }

  // For the second part:
  // compose a dateSkippFilter with any passed in fileFilter (if present)
  // our date filter takes precedence
  function skippingWrappedFilter(credentials, stamp, file /*, item */) {
    const shouldProceed = stamp > maxStamp
    if (!shouldProceed) {
      return shouldProceed
    }
    if (fileFilter) {
      return fileFilter(credentials, stamp, file)
    }
  }

  return iterator(
    'rollup',
    allCredentials,
    wrapCallbackAndGrabDateHandler,
    pattern,
    fileFilter
  ).then(function (/* counts */) {
    // TODO correct return counts...
    console.log(
      'Now call iterator with extrapath: %s after: %s',
      extrapath,
      maxStamp
    )
    return iterator(
      extrapath,
      allCredentials,
      callbackReturningPromise,
      pattern,
      skippingWrappedFilter
    )
  })
}

// TODO: change API to .read
exports = module.exports = {
  dataDirname,
  loadJSON,
  find,
  findByDate,
  findByUserStamp,
  iterator,
  iteratorWithRollup
}
