'use strict'

// Examine transition histograms in history
var _ = require('lodash')

var history = require('./episode-history.json')

// var uniqBykeyAndTypes;
var typedChanges = []
history.forEach(function (episodeHistory) {
  // console.log(episodeHistory);
  // episodeHistory.merged
  episodeHistory.history.forEach(function (entry) {
    // entry.<keys>, entry.changes
    // console.log(entry.changes);
    var chgs = _.filter(entry.changes, {
      op: 'chg'
    })
    if (chgs.length > 0) {
      console.log(chgs)
      var justTypes = _.map(chgs, function (chg) {
        return {
          key: chg.key,
          from: getType(chg.from),
          to: getType(chg.to)
        }
      })
      console.log(justTypes)
      typedChanges = typedChanges.concat(justTypes)
      // justTypes.forEach(function(oneTypeChange) {
      //   typedChanges.push(oneTypeChange)] = true;
      // });
    }
  })
})

function getType (thing) {
  return _.isNull(thing) ? 'null' : typeof thing
}

// for boolean and null...
// function findTransitions (typeToFind) {
//   history.forEach(function (episodeHistory) {
//     var foundFields = []
//     episodeHistory.history.forEach(function (entry) {
//       var chgs = _.filter(entry.changes, function (chg) {
//         if (getType(chg.from) === typeToFind || getType(chg.to) === typeToFind) {
//           // and not from===to ?
//           // and not op='new' ?
//           if (getType(chg.from) !== getType(chg.to) && chg.op !== 'new') {
//             foundFields.push(chg.key)
//           }
//         }
//       })
//       console.log(chgs)
//     })
//     foundFields = _.uniq(foundFields)
//     if (foundFields.length > 0) {
//       // skip these for now
//       // if (_.isEqual(foundFields, ['id']) || _.isEqual(foundFields, ['is_video'])) {
//       //   return;
//       // }
//       console.log('episode with transitioning', typeToFind, foundFields)
//       foundFields.forEach(function (field) {
//         // console.log('  merged', field, episodeHistory.merged[field]);
//         var valueSequence = []
//         episodeHistory.history.forEach(function (entry) {
//           var chgs = _.filter(entry.changes, {
//             key: field
//           })
//           if (chgs.length) {
//             // console.log('  -', chgs);
//             chgs.forEach(function (chg) {
//               valueSequence.push(chg.to)
//             })
//           }
//         })
//         console.log('  key', field, valueSequence, episodeHistory.merged[field])
//       })
//     }
//   })
// }

typedChanges = _.uniq(typedChanges, function (chg) {
  return JSON.stringify(chg) // uniqueness criteria
})
// console.log('typedChanges', typedChanges);
typedChanges = _.filter(typedChanges, function (chg) {
  return chg.from !== chg.to
})
typedChanges = _.sortBy(typedChanges, ['key'])

console.log('\n** typedChanges', typedChanges)

// analysis of null transitions - is 0 always ok (duration)
// duration,played_up_to,playing_status
// end state is null ? (duration = 0|null)
var nulled = _.filter(typedChanges, function (chg) {
  return chg.from === 'null' || chg.to === 'null'
})
console.log('\n** nulled', nulled)
// findTransitions('null');

// analysis of boolean transitions - is 0 always ok
// is_deleted, starred (is_video not observed but assumed)
var booled = _.filter(typedChanges, function (chg) {
  return chg.from === 'boolean' || chg.to === 'boolean'
})
console.log('\n** booled', booled)
// findTransitions('boolean');

// observe sequences by field...
