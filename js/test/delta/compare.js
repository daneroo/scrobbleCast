'use strict'

const expect = require('chai').expect
const delta = require('../../lib/delta')

describe('delta', function () {
  describe('compare', function () {
    const from = {
      uuid: 'a',
      changedfield: 1,
      deletedfield: 1
    }
    const to = {
      uuid: 'a',
      newfield: 1,
      changedfield: 2
    }
    let changes

    beforeEach(function () {
      changes = delta.compare(from, to)
    })

    it('should return changes (new|chg)', function () {
      expect(changes).to.not.equal(null)
      expect(changes).to.deep.equal([{
        op: 'chg',
        key: 'changedfield',
        from: 1,
        to: 2
      }, {
        op: 'new',
        key: 'newfield',
        to: 1
      }])
    })
  })
})
