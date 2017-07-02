'use strict'

// Main Module file for store API and implementations
// Exported API
exports = module.exports = {
  // common

  // deprecate impl member, use db and file
  // db: require('./pg'),
  db: require('./db'),
  file: require('./file'),

  iface: {
    init: async () => {},
    end: async () => {},
    save: (/* item, opts */) => { }, // returns (Promise)(status in insert,duplicate,error)
    load: (/* opts, cb */) => { } // foreach item, cb(item);
  }
}
