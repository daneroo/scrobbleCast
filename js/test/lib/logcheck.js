
'use strict'
const expect = require('chai').expect

// const config = require('../../../api/config')
const logcheck = require('../../lib/logcheck')

describe('logcheck', function () {
  // detectMismatch
  describe('detectMismatch', function () {
    it('should detect mismatches', async function () {
      const input = [
        {
          stamp: '2017-07-07T17:00:00Z',
          host: 'darwin',
          digest: 'abcd'
        },
        {
          stamp: '2017-07-07T17:00:00Z',
          host: 'newton',
          digest: 'bcde'
        }
      ]
      const want = {
        darwin: 'abcd',
        newton: 'bcde'
      }
      const got = logcheck.detectMismatch(input)
      expect(got).to.deep.equal(want)
    })
    it('should acknowledg identical digests on all reporting hosts', async function () {
      const input = [
        {
          stamp: '2017-07-07T17:00:00Z',
          host: 'darwin',
          digest: 'abcd'
        },
        {
          stamp: '2017-07-07T17:00:00Z',
          host: 'newton',
          digest: 'abcd'
        }
      ]
      const want = false
      const got = logcheck.detectMismatch(input)
      expect(got).to.deep.equal(want)
    })
  })
  describe('removeNonReporting', function () {
    it('should remove records for hosts that have not reported recently', async function () {
      const input = [
        {
          stamp: '2017-07-07T17:20Z',
          host: 'almostnotreporting'
        },
        {
          stamp: '2017-07-07T17:19.500Z',
          host: 'notreporting'
        },
        {
          stamp: '2017-07-07T17:30Z',
          host: 'stillReporting'
        }
      ]
      const notReporting = { notreporting: '2017-07-07T17:19.500Z' }
      const want = [
        {
          stamp: '2017-07-07T17:20Z',
          host: 'almostnotreporting'
        },
        {
          stamp: '2017-07-07T17:30Z',
          host: 'stillReporting'
        }
      ]
      const got = logcheck.removeNonReporting(input, notReporting)
      expect(got).to.deep.equal(want)
    })
    it('should return non reporting hosts', async function () {
      const since = '2017-07-07T17:33:25.454Z'
      const input = [
        {
          stamp: '2017-07-07T17:31:25.454Z',
          host: 'euler',
          digest: 'f16143a63cfada48138c63c4f396129b761cc883c5a8a8808c692a23b9e59ed6'
        },
        {
          stamp: '2017-07-07T17:31:12.569Z',
          host: 'dirac.imetrical.com',
          digest: 'f16143a63cfada48138c63c4f396129b761cc883c5a8a8808c692a23b9e59ed6'
        },
        {
          stamp: '2017-07-07T17:21:50.822Z',
          host: 'newton',
          digest: '4b6ca8398d6afa53add0669018ad5fe5fc6376dae606ea8bdc3f07e130a409ed'
        },
        {
          stamp: '2017-07-07T17:21:37.332Z',
          host: 'darwin.imetrical.com',
          digest: '4b6ca8398d6afa53add0669018ad5fe5fc6376dae606ea8bdc3f07e130a409ed'
        },
        {
          stamp: '2017-07-07T17:21:24.550Z',
          host: 'euler',
          digest: 'f16143a63cfada48138c63c4f396129b761cc883c5a8a8808c692a23b9e59ed6'
        },
        {
          stamp: '2017-07-07T17:21:08.211Z',
          host: 'dirac.imetrical.com',
          digest: 'f16143a63cfada48138c63c4f396129b761cc883c5a8a8808c692a23b9e59ed6'
        },
        {
          stamp: '2017-07-07T17:11:49.947Z',
          host: 'newton',
          digest: 'e4499e2c02f2e928b927b0991d46c16d4a24e5d5228af323f1f89b0ae78e57bb'
        },
        {
          stamp: '2017-07-07T17:11:31.843Z',
          host: 'darwin.imetrical.com',
          digest: '7d4c1e1efc44b34caeb3a6bf98c3befd3dd1e406c38feb00153098ab18c31698'
        },
        {
          stamp: '2017-07-07T17:11:24.839Z',
          host: 'euler',
          digest: 'e4499e2c02f2e928b927b0991d46c16d4a24e5d5228af323f1f89b0ae78e57bb'
        },
        {
          stamp: '2017-07-07T17:11:09.043Z',
          host: 'dirac.imetrical.com',
          digest: '06f05a64b42c947cc8b13a8c32306866453304e727aa051df90aa3036a615c87'
        },
        {
          stamp: '2017-07-07T17:03:17.893Z',
          host: 'newton',
          digest: '8fa9b7336160c6ac098af7ad76635ba69b122bdb2971c091c2663cee9924b920'
        },
        {
          stamp: '2017-07-07T17:02:45.084Z',
          host: 'euler',
          digest: '8fa9b7336160c6ac098af7ad76635ba69b122bdb2971c091c2663cee9924b920'
        },
        {
          stamp: '2017-07-07T17:02:39.930Z',
          host: 'dirac.imetrical.com',
          digest: '43dd5268c17d4fd408a25c5c60c623bcb840849f672bc313a32f5e4736bf5295'
        },
        {
          stamp: '2017-07-07T17:01:59.805Z',
          host: 'CAOTT-MB00292',
          digest: '4c5ee7c3019db3e17ad980d41f6b737cd3569c460fc1a7f902867a24ce5e76c1'
        },
        {
          stamp: '2017-07-07T17:01:35.446Z',
          host: 'darwin.imetrical.com',
          digest: '07e305466fe04244d46b76f8dde367a0510b26811d1c42435530a6054c0c6ad2'
        }
      ]
      const want = { 'CAOTT-MB00292': '2017-07-07T17:01:59.805Z' }
      const got = logcheck.detectNonReporting(input, since)
      expect(got).to.deep.equal(want)
    })
  })
  describe('detectNonReporting', function () {
    it('should return a host that has not reported recently', async function () {
      const since = '2017-07-07T17:40Z'
      const input = [
        {
          stamp: '2017-07-07T17:20Z',
          host: 'almostnotreporting'
        },
        {
          stamp: '2017-07-07T17:19.500Z',
          host: 'notreporting'
        },
        {
          stamp: '2017-07-07T17:30Z',
          host: 'stillReporting'
        }
      ]
      const want = { notreporting: '2017-07-07T17:19.500Z' }
      const got = logcheck.detectNonReporting(input, since)
      expect(got).to.deep.equal(want)
    })
    it('should return non reporting hosts', async function () {
      const since = '2017-07-07T17:33:25.454Z'
      const input = [
        {
          stamp: '2017-07-07T17:31:25.454Z',
          host: 'euler',
          digest: 'f16143a63cfada48138c63c4f396129b761cc883c5a8a8808c692a23b9e59ed6'
        },
        {
          stamp: '2017-07-07T17:31:12.569Z',
          host: 'dirac.imetrical.com',
          digest: 'f16143a63cfada48138c63c4f396129b761cc883c5a8a8808c692a23b9e59ed6'
        },
        {
          stamp: '2017-07-07T17:21:50.822Z',
          host: 'newton',
          digest: '4b6ca8398d6afa53add0669018ad5fe5fc6376dae606ea8bdc3f07e130a409ed'
        },
        {
          stamp: '2017-07-07T17:21:37.332Z',
          host: 'darwin.imetrical.com',
          digest: '4b6ca8398d6afa53add0669018ad5fe5fc6376dae606ea8bdc3f07e130a409ed'
        },
        {
          stamp: '2017-07-07T17:21:24.550Z',
          host: 'euler',
          digest: 'f16143a63cfada48138c63c4f396129b761cc883c5a8a8808c692a23b9e59ed6'
        },
        {
          stamp: '2017-07-07T17:21:08.211Z',
          host: 'dirac.imetrical.com',
          digest: 'f16143a63cfada48138c63c4f396129b761cc883c5a8a8808c692a23b9e59ed6'
        },
        {
          stamp: '2017-07-07T17:11:49.947Z',
          host: 'newton',
          digest: 'e4499e2c02f2e928b927b0991d46c16d4a24e5d5228af323f1f89b0ae78e57bb'
        },
        {
          stamp: '2017-07-07T17:11:31.843Z',
          host: 'darwin.imetrical.com',
          digest: '7d4c1e1efc44b34caeb3a6bf98c3befd3dd1e406c38feb00153098ab18c31698'
        },
        {
          stamp: '2017-07-07T17:11:24.839Z',
          host: 'euler',
          digest: 'e4499e2c02f2e928b927b0991d46c16d4a24e5d5228af323f1f89b0ae78e57bb'
        },
        {
          stamp: '2017-07-07T17:11:09.043Z',
          host: 'dirac.imetrical.com',
          digest: '06f05a64b42c947cc8b13a8c32306866453304e727aa051df90aa3036a615c87'
        },
        {
          stamp: '2017-07-07T17:03:17.893Z',
          host: 'newton',
          digest: '8fa9b7336160c6ac098af7ad76635ba69b122bdb2971c091c2663cee9924b920'
        },
        {
          stamp: '2017-07-07T17:02:45.084Z',
          host: 'euler',
          digest: '8fa9b7336160c6ac098af7ad76635ba69b122bdb2971c091c2663cee9924b920'
        },
        {
          stamp: '2017-07-07T17:02:39.930Z',
          host: 'dirac.imetrical.com',
          digest: '43dd5268c17d4fd408a25c5c60c623bcb840849f672bc313a32f5e4736bf5295'
        },
        {
          stamp: '2017-07-07T17:01:59.805Z',
          host: 'CAOTT-MB00292',
          digest: '4c5ee7c3019db3e17ad980d41f6b737cd3569c460fc1a7f902867a24ce5e76c1'
        },
        {
          stamp: '2017-07-07T17:01:35.446Z',
          host: 'darwin.imetrical.com',
          digest: '07e305466fe04244d46b76f8dde367a0510b26811d1c42435530a6054c0c6ad2'
        }
      ]
      const want = { 'CAOTT-MB00292': '2017-07-07T17:01:59.805Z' }
      const got = logcheck.detectNonReporting(input, since)
      expect(got).to.deep.equal(want)
    })
  })
  describe('lastReportedStamp', function () {
    it('should return last time each host reported', async function () {
      const input = [
        {
          stamp: '2017-07-07T17:00:00Z',
          host: 'darwin',
          digest: 'abcd'
        },
        {
          stamp: '2017-07-07T17:00:00Z',
          host: 'newton',
          digest: 'bcde'
        },
        {
          stamp: '2017-07-07T18:00:00Z',
          host: 'darwin',
          digest: 'defa'
        },
        {
          stamp: '2017-07-07T16:00:00Z',
          host: 'darwin',
          digest: 'efab'
        }
      ]
      const want = {
        darwin: '2017-07-07T18:00:00Z',
        newton: '2017-07-07T17:00:00Z'
      }
      const got = logcheck.lastReportedStamp(input)
      expect(got).to.deep.equal(want)
    })
  })
  describe('lastReportedDigest', function () {
    it('should return last time each host reported', async function () {
      const input = [
        {
          stamp: '2017-07-07T17:00:00Z',
          host: 'darwin',
          digest: 'abcd'
        },
        {
          stamp: '2017-07-07T17:00:00Z',
          host: 'newton',
          digest: 'bcde'
        },
        {
          stamp: '2017-07-07T18:00:00Z',
          host: 'darwin',
          digest: 'defa'
        },
        {
          stamp: '2017-07-07T16:00:00Z',
          host: 'darwin',
          digest: 'efab'
        }
      ]
      const want = {
        darwin: 'defa',
        newton: 'bcde'
      }
      const got = logcheck.lastReportedDigest(input)
      expect(got).to.deep.equal(want)
    })
  })
  describe('lastReportedRecord', function () {
    it('should return last time each host reported', async function () {
      const input = [
        {
          stamp: '2017-07-07T17:00:00Z',
          host: 'darwin',
          digest: 'abcd'
        },
        {
          stamp: '2017-07-07T17:00:00Z',
          host: 'newton',
          digest: 'bcde'
        },
        {
          stamp: '2017-07-07T18:00:00Z',
          host: 'darwin',
          digest: 'defa'
        },
        {
          stamp: '2017-07-07T16:00:00Z',
          host: 'darwin',
          digest: 'efab'
        }
      ]
      const want = {
        darwin: {
          digest: 'defa',
          host: 'darwin',
          stamp: '2017-07-07T18:00:00Z'
        },
        newton: {
          digest: 'bcde',
          host: 'newton',
          stamp: '2017-07-07T17:00:00Z'
        }
      }
      const got = logcheck.lastReportedRecord(input)
      expect(got).to.deep.equal(want)
    })
  })
  describe('parseCheckpointEvents', function () {
    it('should parse checkpoint entries', async function () {
      const input = [
        {
          timestamp: 1499113293331,
          tags: [
            'host-newton'
          ],
          event: {
            json: {
              digest: '882f413f412d7d19ecf6d8a75a1e465c620c1f8db34cdc8178e05b5b85ec241f'
            }
          }
        },
        {
          timestamp: 1499113286266,
          tags: [
            'host-darwin.imetrical.com'
          ],
          event: {
            json: {
              digest: '882f413f412d7d19ecf6d8a75a1e465c620c1f8db34cdc8178e05b5b85ec241f'
            }
          }
        }

      ]
      const want = [
        {
          digest: '882f413f412d7d19ecf6d8a75a1e465c620c1f8db34cdc8178e05b5b85ec241f',
          host: 'newton',
          stamp: '2017-07-03T20:21:33.331Z'
        },
        {
          digest: '882f413f412d7d19ecf6d8a75a1e465c620c1f8db34cdc8178e05b5b85ec241f',
          host: 'darwin.imetrical.com',
          stamp: '2017-07-03T20:21:26.266Z'
        }
      ]
      const got = logcheck.parseCheckpointEvents(input)
      expect(got).to.deep.equal(want)
    })

    it('should return unknown if host-* not found', async function () {
      const input = [
        {
          timestamp: 0,
          tags: [
            'host-newton'
          ],
          event: {
            json: {
              digest: 'abc'
            }
          }
        },
        {
          timestamp: 0,
          tags: [
            // missing
          ],
          event: {
            json: {
              digest: 'bcd'
            }
          }
        },
        {
          timestamp: 0,
          tags: [
            'not-start-with-host-newton'
          ],
          event: {
            json: {
              digest: 'cde'
            }
          }
        }
      ]
      const want = [
        {
          digest: 'abc',
          host: 'newton',
          stamp: '1970-01-01T00:00:00.000Z'
        },
        {
          digest: 'bcd',
          host: 'unknown',
          stamp: '1970-01-01T00:00:00.000Z'
        },
        {
          digest: 'cde',
          host: 'unknown',
          stamp: '1970-01-01T00:00:00.000Z'
        }
      ]
      const got = logcheck.parseCheckpointEvents(input)
      expect(got).to.deep.equal(want)
    })
    it('should filter out records with event.json.digest missing', async function () {
      const input = [
        {
          timestamp: 0,
          tags: [
            'host-start'
          ],
          event: {
            json: {
              digest: 'abc'
            }
          }
        },
        {
          timestamp: 0,
          tags: [
            'host-digest-null'
          ],
          event: {
            json: {
              digest: null
            }
          }
        },
        {
          timestamp: 0,
          tags: [
            'host-event.json.digest-missing'
          ],
          event: {
            json: {
            }
          }
        },
        {
          timestamp: 0,
          tags: [
            'host-event.json-missing'
          ],
          event: {
          }
        },
        {
          timestamp: 0,
          tags: [
            'host-event-missing'
          ]
        },
        {
          timestamp: 0,
          tags: [
            'host-end'
          ],
          event: {
            json: {
              digest: 'zyx'
            }
          }
        }
      ]
      const want = [
        {
          digest: 'abc',
          host: 'start',
          stamp: '1970-01-01T00:00:00.000Z'
        },
        {
          digest: 'zyx',
          host: 'end',
          stamp: '1970-01-01T00:00:00.000Z'
        }
      ]
      const got = logcheck.parseCheckpointEvents(input)
      expect(got).to.deep.equal(want)
    })
  })
})

// example records as in : getCheckpointRecords
// function getEntries () {
//   return [
//     {
//       'raw': '{"digest":"882f413f412d7d19ecf6d8a75a1e465c620c1f8db34cdc8178e05b5b85ec241f","level":"info","message":"checkpoint"}',
//       'logtypes': [
//         'json'
//       ],
//       'timestamp': 1499113293331,
//       'unparsed': null,
//       'logmsg': '{"digest":"882f413f412d7d19ecf6d8a75a1e465c620c1f8db34cdc8178e05b5b85ec241f","level":"info","message":"checkpoint"}',
//       'id': '34c6a0b1-602d-11e7-8085-0a1f4c3bd778',
//       'tags': [
//         'host-newton',
//         'pocketscrape'
//       ],
//       'event': {
//         'json': {
//           'message': 'checkpoint',
//           'digest': '882f413f412d7d19ecf6d8a75a1e465c620c1f8db34cdc8178e05b5b85ec241f',
//           'level': 'info'
//         },
//         'http': {
//           'clientHost': '24.202.212.145',
//           'contentType': 'application/json'
//         }
//       }
//     },
//     {
//       'raw': '{"digest":"882f413f412d7d19ecf6d8a75a1e465c620c1f8db34cdc8178e05b5b85ec241f","level":"info","message":"checkpoint"}',
//       'logtypes': [
//         'json'
//       ],
//       'timestamp': 1499113286266,
//       'unparsed': null,
//       'logmsg': '{"digest":"882f413f412d7d19ecf6d8a75a1e465c620c1f8db34cdc8178e05b5b85ec241f","level":"info","message":"checkpoint"}',
//       'id': '30909805-602d-11e7-8045-0a2c94e2fb74',
//       'tags': [
//         'pocketscrape',
//         'host-darwin.imetrical.com'
//       ],
//       'event': {
//         'json': {
//           'message': 'checkpoint',
//           'digest': '882f413f412d7d19ecf6d8a75a1e465c620c1f8db34cdc8178e05b5b85ec241f',
//           'level': 'info'
//         },
//         'http': {
//           'clientHost': '24.202.212.145',
//           'contentType': 'application/json'
//         }
//       }
//     },
//     {
//       'raw': '{"digest":"882f413f412d7d19ecf6d8a75a1e465c620c1f8db34cdc8178e05b5b85ec241f","level":"info","message":"checkpoint"}',
//       'logtypes': [
//         'json'
//       ],
//       'timestamp': 1499113281373,
//       'unparsed': null,
//       'logmsg': '{"digest":"882f413f412d7d19ecf6d8a75a1e465c620c1f8db34cdc8178e05b5b85ec241f","level":"info","message":"checkpoint"}',
//       'id': '2da5e0f6-602d-11e7-80a4-0a2c94e2fb74',
//       'tags': [
//         'pocketscrape',
//         'host-euler'
//       ],
//       'event': {
//         'json': {
//           'message': 'checkpoint',
//           'digest': '882f413f412d7d19ecf6d8a75a1e465c620c1f8db34cdc8178e05b5b85ec241f',
//           'level': 'info'
//         },
//         'http': {
//           'clientHost': '24.202.212.145',
//           'contentType': 'application/json'
//         }
//       }
//     },
//     {
//       'raw': '{"digest":"882f413f412d7d19ecf6d8a75a1e465c620c1f8db34cdc8178e05b5b85ec241f","level":"info","message":"checkpoint"}',
//       'logtypes': [
//         'json'
//       ],
//       'timestamp': 1499113268557,
//       'unparsed': null,
//       'logmsg': '{"digest":"882f413f412d7d19ecf6d8a75a1e465c620c1f8db34cdc8178e05b5b85ec241f","level":"info","message":"checkpoint"}',
//       'id': '2602728e-602d-11e7-8047-0a2c94e2fb74',
//       'tags': [
//         'pocketscrape',
//         'host-dirac.imetrical.com'
//       ],
//       'event': {
//         'json': {
//           'message': 'checkpoint',
//           'digest': '882f413f412d7d19ecf6d8a75a1e465c620c1f8db34cdc8178e05b5b85ec241f',
//           'level': 'info'
//         },
//         'http': {
//           'clientHost': '24.202.212.145',
//           'contentType': 'application/json'
//         }
//       }
//     },
//     {
//       'raw': '{"digest":"882f413f412d7d19ecf6d8a75a1e465c620c1f8db34cdc8178e05b5b85ec241f","level":"info","message":"checkpoint"}',
//       'logtypes': [
//         'json'
//       ],
//       'timestamp': 1499112723462,
//       'unparsed': null,
//       'logmsg': '{"digest":"882f413f412d7d19ecf6d8a75a1e465c620c1f8db34cdc8178e05b5b85ec241f","level":"info","message":"checkpoint"}',
//       'id': 'e11b7cdf-602b-11e7-8047-123ee2afbd8a',
//       'tags': [
//         'host-newton',
//         'pocketscrape'
//       ],
//       'event': {
//         'json': {
//           'message': 'checkpoint',
//           'digest': '882f413f412d7d19ecf6d8a75a1e465c620c1f8db34cdc8178e05b5b85ec241f',
//           'level': 'info'
//         },
//         'http': {
//           'clientHost': '24.202.212.145',
//           'contentType': 'application/json'
//         }
//       }
//     }]
// }
