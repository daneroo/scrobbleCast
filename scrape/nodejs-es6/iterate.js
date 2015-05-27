"use strict";

// example use of file iterator
var srcFile = require('./lib/source/file');

// globals
var allCredentials = require('./credentials.json');

function doOneItem(credentials, stamp, file, item) {
  // console.log('file:',file);
}

// var extra = 'noredux';
var extra = '';
srcFile.iterator(extra, allCredentials, doOneItem)
  .then(function(counts) {
    Object.keys(counts).forEach(function(name) {
      var c = counts[name];
      console.log('--' + extra + '-- ' + name + '|stamps|:' + c.stamp + ' |f|:' + c.file + ' |p|:' + c.part);
    });
  });
