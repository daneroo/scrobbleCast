'use strict'

// var fs = require('fs')
var pull = require('pull-stream')

//  simple example - works
// pull(
//   pull.values(['index.js', 'cron.js', 'delta.js']),
//   pull.asyncMap(fs.stat),
//   pull.collect(function (err, array) {
//     console.log(array)
//   })
// );

// Pipe notation -works
// pull.values(['index.js', 'cron.js', 'delta.js'])
//  .pipe(pull.asyncMap(fs.stat))
//  .pipe(pull.collect(function (err, array) {
//     console.log(array)
//   }));

// function readdir() {
//   return fs.readdirSync(path.join(dataDirname, 'byDate'));
//   // return new Promise(function(resolve, reject) {
//   //   fs.readdir
//   // });
// }

var createSourceStream = pull.Source(function () {
  return function (end, cb) {
    // return cb(end, Math.random())
    setTimeout(function () {
      cb(end, Math.random())
    }, 50)
  }
})

// var createThroughStream = pull.Through(function (read) {
//   return function (end, cb) {
//     // read(end, cb)
//     read(end, function (end2, data) {
//       console.log('--data:', data, 1 - data)
//       cb(end, data)
//     })
//   }
// })

var plusOne = pull.map(function (data) {
  // if null ?
  return data + 1
})

var plusN = function (n) {
  return pull.map(function (data) {
    // if null ?
    return data + n
  })
}

// var createSinkStream = pull.Sink(function (read) {
//   read(null, function next (end, data) {
//     if (end) return
//     console.log(data)
//     read(null, next)
//   })
// })

// same as above (better end check)
var logger = pull.Sink(function (read) {
  read(null, function next (end, data) {
    if (end === true) return
    if (end) throw end

    console.log(data)
    read(null, next)
  })
})

// copied from pull.log
// var mySink = function (read, done) {
//   return pull.drain(read, function (data) {
//     console.log(data)
//   }, done)
// }

  // NOT WORKING pull(createSourceStream(), createThroughStream()), createSinkStream());
  // pull(createSourceStream(),pull.log()) // ok
  // pull(createSourceStream(),logger()) // ok, but stack overflow (when no async??)
  // pull(createSourceStream(),pull.take(100),createSinkStream()) // ok
  // pull(createSourceStream(),pull.take(100),logger()) // ok
  // pull(createSourceStream(),pull.take(100),mySink()) // NOT OK
  // pull(createSourceStream(),pull.take(100),createThroughStream(),logger()) // stack++
// pull(createSourceStream(), pull.take(100), plusOne, logger()) // ok
// pull(createSourceStream(), pull.take(100), plusN(10), logger()) // ok
pull(createSourceStream(), pull.take(100), plusOne, plusN(10), logger()) // ok
  // pull(createSourceStream(),pull.take(100),createThroughStream(),plusOne,logger()) // stack++

// pull(
//     pull.count(),
//     pull.take(21),
//     pull.asyncMap(function (data, cb) {
//       return cb(null, data + 1)
//     }),
//     pull.log()
//     // pull.collect(function (err, ary) {
//     //   console.log(ary)
//     // }),
//   )

// /end
