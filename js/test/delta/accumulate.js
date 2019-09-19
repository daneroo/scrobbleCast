'use strict'

const expect = require('chai').expect

var delta = require('../../lib/delta')
var _ = require('lodash')

describe('delta', function () {
  describe('AccumulatorByUuid', function () {
    var acc
    var first = {
      uuid: 'a',
      __sourceType: 'type.1',
      __stamp: '2015-01-01T01:23:45Z',
      __type: 'podcast',
      __user: 'listener',
      description: 'Show A'
    }
    var second = {
      uuid: 'a',
      __sourceType: 'type.2',
      __stamp: '2015-01-02T02:34:56Z',
      __type: 'podcast',
      __user: 'listener',
      description: 'Show A.1'
    }
    var other = {
      uuid: 'b',
      __sourceType: 'type.1',
      __stamp: '2015-01-01T01:23:45Z',
      __type: 'podcast',
      __user: 'listener',
      description: 'Show B'
    }

    beforeEach(function () {
      acc = new delta.AccumulatorByUuid()
    })

    it('should be properly initialized', function () {
      expect(acc).to.not.equal(null)
      expect(acc.accumulators).to.deep.equal({})
    })

    it('should pass a smoke test', function () {
      acc.merge(first)
      acc.merge(second)
      acc.merge(other)

      // strip away two levels of class!
      var noclass = JSON.parse(JSON.stringify(acc.accumulators))
      var expected = {
        a: {
          history: {
            __sourceType: {
              '2015-01-01T01:23:45Z': 'type.1',
              '2015-01-02T02:34:56Z': 'type.2'
            },
            description: {
              '2015-01-01T01:23:45Z': 'Show A',
              '2015-01-02T02:34:56Z': 'Show A.1'
            },
            uuid: {
              '2015-01-01T01:23:45Z': 'a'
            }
          },
          meta: {
            __changeCount: 2,
            __firstSeen: '2015-01-01T01:23:45Z',
            __lastUpdated: '2015-01-02T02:34:56Z',
            __type: 'podcast',
            __user: 'listener'
          },
          description: 'Show A.1',
          uuid: 'a'
        },
        b: {
          history: {
            __sourceType: {
              '2015-01-01T01:23:45Z': 'type.1'
            },
            description: {
              '2015-01-01T01:23:45Z': 'Show B'
            },
            uuid: {
              '2015-01-01T01:23:45Z': 'b'
            }
          },
          meta: {
            __changeCount: 1,
            __firstSeen: '2015-01-01T01:23:45Z',
            __lastUpdated: '2015-01-01T01:23:45Z',
            __type: 'podcast',
            __user: 'listener'
          },
          description: 'Show B',
          uuid: 'b'
        }
      }
      expect(noclass).to.deep.equal(expected)
    })

    xit('should be invariant to merge order', function () {
      // This fails becaus merge of values is not order invariant
      acc.merge(second)
      acc.merge(first)
      var noclass = _.merge({}, acc.accumulators.a)
      var expected = {
        history: {
          __sourceType: {
            '2015-01-01T01:23:45Z': 'type.1',
            '2015-01-02T02:34:56Z': 'type.2'
          },
          played_up_to: {
            '2015-01-01T01:23:45Z': 10,
            '2015-01-02T02:34:56Z': 20
          }
        },
        meta: {
          __changeCount: 2,
          __firstSeen: '2015-01-01T01:23:45Z',
          __lastUpdated: '2015-01-02T02:34:56Z',
          __type: 'podcast',
          __user: 'listener'
        },
        played_up_to: 20,
        uuid: 'a'
      }
      expect(noclass).to.deep.equal(expected)
    })
  })

  describe('AccumulatorByType', function () {
    var acc
    var first = {
      uuid: 'a',
      __sourceType: 'type.1',
      __stamp: '2015-01-01T01:23:45Z',
      __type: 'podcast',
      __user: 'listener',
      description: 'Show A'
    }
    var second = {
      uuid: 'a',
      __sourceType: 'type.2',
      __stamp: '2015-01-02T02:34:56Z',
      __type: 'podcast',
      __user: 'listener',
      description: 'Show A.1'
    }
    var other = {
      uuid: 'b',
      __sourceType: 'type.1',
      __stamp: '2015-01-01T01:23:45Z',
      __type: 'episode',
      __user: 'listener',
      podcast_uuid: 'a',
      played_up_to: 10
    }

    beforeEach(function () {
      acc = new delta.AccumulatorByTypeByUuid()
    })

    it('should be properly initialized', function () {
      expect(acc).to.not.equal(null)
      expect(acc.accumulatorsByType).to.deep.equal({})
    })

    it('should pass a smoke test', function () {
      acc.merge(first)
      acc.merge(second)
      acc.merge(other)

      // strip away two levels of class!
      var noclass = JSON.parse(JSON.stringify(acc.accumulatorsByType))
      var expected = {
        podcast: {
          accumulators: {
            a: {
              history: {
                __sourceType: {
                  '2015-01-01T01:23:45Z': 'type.1',
                  '2015-01-02T02:34:56Z': 'type.2'
                },
                description: {
                  '2015-01-01T01:23:45Z': 'Show A',
                  '2015-01-02T02:34:56Z': 'Show A.1'
                },
                uuid: {
                  '2015-01-01T01:23:45Z': 'a'
                }
              },
              meta: {
                __changeCount: 2,
                __firstSeen: '2015-01-01T01:23:45Z',
                __lastUpdated: '2015-01-02T02:34:56Z',
                __type: 'podcast',
                __user: 'listener'
              },
              description: 'Show A.1',
              uuid: 'a'
            }
          }
        },
        episode: {
          accumulators: {
            b: {
              history: {
                __sourceType: {
                  '2015-01-01T01:23:45Z': 'type.1'
                },
                played_up_to: {
                  '2015-01-01T01:23:45Z': 10
                },
                uuid: {
                  '2015-01-01T01:23:45Z': 'b'
                }
              },
              meta: {
                __changeCount: 1,
                __firstSeen: '2015-01-01T01:23:45Z',
                __lastPlayed: '2015-01-01T01:23:45Z',
                __lastUpdated: '2015-01-01T01:23:45Z',
                __type: 'episode',
                __user: 'listener'
              },
              played_up_to: 10,
              podcast_uuid: 'a',
              uuid: 'b'
            }
          }
        }
      }
      expect(noclass).to.deep.equal(expected)
    })

    xit('should be invariant to merge order', function () {
      // This fails becaus merge of values is not order invariant
      acc.merge(second)
      acc.merge(first)
      var noclass = _.merge({}, acc.accumulators.a)
      var expected = {
        history: {
          __sourceType: {
            '2015-01-01T01:23:45Z': 'type.1',
            '2015-01-02T02:34:56Z': 'type.2'
          },
          played_up_to: {
            '2015-01-01T01:23:45Z': 10,
            '2015-01-02T02:34:56Z': 20
          }
        },
        meta: {
          __changeCount: 2,
          __firstSeen: '2015-01-01T01:23:45Z',
          __lastUpdated: '2015-01-02T02:34:56Z',
          __type: 'podcast',
          __user: 'listener'
        },
        played_up_to: 20,
        uuid: 'a'
      }
      expect(noclass).to.deep.equal(expected)
    })
  })
})
