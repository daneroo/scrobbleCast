'use strict'

const expect = require('chai').expect

const delta = require('../../lib/delta')

describe('delta', function () {
  describe('normalize', function () {
    it('should cast certain boolean fields', function () {
      const n = delta.normalize({
        uuid: 'a',
        othernullable: null,
        is_deleted: null,
        starred: 0,
        is_video: null
      })
      expect(n).to.deep.equal({
        uuid: 'a',
        othernullable: null,
        is_deleted: false,
        starred: false,
        is_video: false
      })
    })

    it('should remove certain nullable fields', function () {
      const n = delta.normalize({
        uuid: 'a',
        othernullable: null,
        duration: null,
        played_up_to: null,
        playing_status: null
      })
      expect(n).to.deep.equal({
        uuid: 'a',
        othernullable: null
      })
    })
  })

  it('should be awesome', function () {
    const thing = 'awesome'
    expect(thing).to.equal('awesome')
  })
})
