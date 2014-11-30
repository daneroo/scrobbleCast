"use strict";

// High level,
// histogram by field (type>type)
var _ = require('lodash');


var history = require('./episode-history.json');

// var uniqBykeyAndTypes;
var typedChanges = [];
history.forEach(function(episode_history) {
  // console.log(episode_history);
  // episode_history.merged
  episode_history.history.forEach(function(entry) {
    // entry.<keys>, entry.changes
    // console.log(entry.changes);
    var chgs = _.filter(entry.changes, {
      op: 'chg'
    });
    if (chgs.length > 0) {
      console.log(chgs);
      var justTypes = _.map(chgs, function(chg) {
        return {
          key: chg.key,
          from: _.isNull(chg.from) ? 'null' : typeof chg.from,
          to: _.isNull(chg.to) ? 'null' : typeof chg.to
        };
      });
      console.log(justTypes);
      typedChanges = typedChanges.concat(justTypes);
      // justTypes.forEach(function(oneTypeChange) {
      //   typedChanges.push(oneTypeChange)] = true;
      // });

    }
  })
});


var typedChanges = _.uniq(typedChanges,function(chg){
  return JSON.stringify(chg);
});
console.log('typedChanges', typedChanges);
typedChanges = _.filter(typedChanges, function(chg) {
  return chg.from !== chg.to;
})
typedChanges = _.sortBy(typedChanges, ['key']);

console.log('significant typedChanges', typedChanges);