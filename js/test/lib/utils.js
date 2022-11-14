'use strict'
const expect = require('chai').expect

// const config = require('../../../api/config')
const utils = require('../../lib/utils')

describe('utils', function () {
  describe('stamp(grain)', function () {
    it('should verify no grain, no stamp', function () {
      const expectedNoGrain = new Date().toISOString()
      const roundedNoGrain = utils.stamp()
      expect(roundedNoGrain).to.have.length(24)
      // To prevent this: AssertionError: expected '2018-02-23T08:57:20.562Z' to equal '2018-02-23T08:57:20.561Z'
      // we trim off the last three chars (:20.5|62Z) to compare to tehnth of second
      expect(roundedNoGrain.slice(0, -3)).to.equal(expectedNoGrain.slice(0, -3))
    })
    it('should verify minute, no stamp', function () {
      const now = new Date().toISOString()
      const expectedNoGrain = now.slice(0, 17) + '00Z'
      const roundedNoGrain = utils.stamp('minute')
      expect(roundedNoGrain).to.have.length(20)
      expect(roundedNoGrain).to.equal(expectedNoGrain)
    })
  })

  describe('stamp(grain,stamp)', function () {
    it('should verify specific dates', function () {
      const test = [
        {
          stamp: '2018-01-01T00:00:00Z',
          grain: 'minute',
          rounded: '2018-01-01T00:00:00Z'
        },
        {
          stamp: '2018-01-01T00:10:00Z',
          grain: '10minutes',
          rounded: '2018-01-01T00:10:00Z'
        },
        {
          stamp: '2018-01-01T12:34:56.789Z',
          grain: 'minute',
          rounded: '2018-01-01T12:34:00Z'
        },
        {
          stamp: '2018-01-01T12:34:56.789Z',
          grain: '10minutes',
          rounded: '2018-01-01T12:30:00Z'
        }
      ]
      for (const t of test) {
        const rounded = utils.stamp(t.grain, t.stamp)
        expect(rounded).to.equal(t.rounded)
      }
    })
  })
})
