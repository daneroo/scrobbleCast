'use strict';

// Not sure how to design the interface.
//  perhaps a decorator or extra method for the main Ouch object
//  For now this is just a placeholder for already written code

// dependencies - core-public-internal
var _ = require('lodash');

exports = module.exports = {
  save: bulkSave
};

var log = function(){};

// Make jshint happy: external dependancies:
var db;
function save(item){
  // this just saves one item.
}
// batch's scope is dependant on how it is called
function bulkSave(batchSize) {
  // verbose('--bulkSave',batchSize)
  // save | bulk save[1] or bulk
  if (!batchSize) {
    return save;
  }
  // if (batchSize === 1) {
  //   return function(item) {
  //     db.bulkDocs([item]);
  //   };
  // }
  // else
  var batch = [];
  return function(item) {
      // verbose('-bulkSave:', [batchSize,batch.length,item._id]);
    if (batch.length < batchSize) {
      // verbose('-create:bulk:', [item._id,item._rev]);
      batch.push(item);
      // verbose('+bulkSave:', [batchSize,batch.length,item._id]);
      return 'batched';
    }
    return db.bulkDocs(batch)
      .then(function(result) {
        var summary = _.countBy(result,function(one){
          if (one.ok){
            return 'OK';
          }
          if (one.error){
            return one.status;
          }
          return 'UNKNOWN';
        });
        log('create:bulk:', summary);
        batch = [];
      });
  };
}
