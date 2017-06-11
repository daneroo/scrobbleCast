
'use strict'
exports = module.exports = {
  makeItem: makeItem
}

function makeItem (i) {
  const mod = 16 ** 4 // 4 hex chars
  const hex = Number(mod + i % mod).toString(16).substr(-4)
  return {
    '__type': 'episode',
    '__sourceType': '02-podcasts',
    '__user': 'mock',
    '__stamp': '2017-06-01T00:00:00Z',
    'podcast_uuid': `podcast-${hex}`,
    'id': null,
    'uuid': `episode-${hex}`
      // 'url': 'http://podcast.com/episode.mp3',
      // 'published_at': '2017-05-31 00:00:00',
      // 'duration': '1733',
      // 'file_type': 'audio/mp3',
      // 'title': 'Worldwide condemnation of Kabul bombing',
      // 'size': 13864000,
      // 'playing_status': 0,
      // 'played_up_to': 0,
      // 'is_deleted': 0,
      // 'starred': 0,
      // 'is_video': false
  }
}
