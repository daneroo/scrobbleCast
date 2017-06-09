'use strict'

// Temp utility: convert byDate -> byUserStamp
// implies daniel

var path = require('path')
var _ = require('lodash')
var utils = require('./lib/utils')
var srcFile = require('./lib/source/file')
var sinkFile = require('./lib/sink/file')

// @param file(name)
// @param items: [{podcast|episode}]
// return  [{key:{type,[podcastUuid],uuid,stamp,sourceType} values:[things]}]
function readByDate (file) {
  var items = srcFile.loadJSON(file)
  if (items.length === 0) {
    // throw new Error('readByDate: no things to split by keys: ' + file);
    return []
  }

  var stamp = utils.stampFromFile(file)
  // match the sourceType and optionally the podcastUuid for 02-podcasts (old)
  var match = file.match(/(01-podcasts|02-podcasts|03-new_releases|04-in_progress)(\/(.*))?\.json/)
  var sourceType = match[1]
  var podcastUuid = match[3]
  var type = (sourceType === '01-podcasts') ? 'podcast' : 'episode'

  var extra = {}
  // prepend our extra descriptor fields (to optionally passed in values)
  extra = _.merge({
    __type: (sourceType === '01-podcasts') ? 'podcast' : 'episode',
    __sourceType: sourceType,
    __user: 'daniel',
    __stamp: stamp
  }, extra || {})

  // extra assert (02- fix)
  if (sourceType === '02-podcasts') {
    if (!podcastUuid) {
      throw (new Error('readByDate: no podcastUuid for 02-podcasts: ' + file))
    }
    extra = _.merge(extra, {
      podcastUuid: podcastUuid
    })
  }

  // prepend extra descriptor fiels to each item
  var decoratedItems = _.map(items, function (item) {
    return _.merge({}, extra, item)
  })

  // run some assertions
  decoratedItems.forEach(function (item) {
    if (!item.uuid) {
      throw (new Error('readByDate: no uuid in item!'))
    }
    if (type === 'episode' && !item.podcastUuid) {
      throw (new Error('readByDate: no podcastUuid for file:' + file))
    }
    if (!item.title) { // just checking because we are adding to key - for tracing
      throw new Error('readByDate missing title' /* + JSON.stringify(keyeditems) */)
    }
  })
  return decoratedItems
}

// srcFile.find('byDate/**/*.json')
srcFile.findByDate()
  .then(function (stamps) {
    utils.logStamp('Starting:Delta ')
    // console.log('stamps', stamps);
    console.log('-|stamps|', stamps.length)
    // stamps = stamps.slice(0, 3000);
    console.log('+|stamps|', stamps.length)

    var partCount = 0
    var fileCount = 0

    // should have a version without aggregation
    utils.serialPromiseChainMap(stamps, function (stamp) {
      console.log('--iteration stamp:', stamp)
      return srcFile.find(path.join('byDate', stamp, '**/*.json'))
          .then(function (files) {
            files.forEach(function (file) {
              console.log('---file:', file)
              var items = readByDate(file)

              sinkFile.writeByUserStamp(items)

              fileCount++
              items.forEach(function (keyedThing) {
                partCount++

                // Normalize values (bool/null) (no cloning...)
                // keyedThing.value = delta.normalize(keyedThing.value);
              })
            })
          })
    })
      .then(function (dontCare) {
        utils.logStamp('Done:Delta |f|:' + fileCount + ' |e|:' + partCount)
        return 'done'
      })
  })
  .catch(function (error) {
    console.error('Error:Delta', error)
    utils.logStamp('Error:Delta ' + error)
  })
