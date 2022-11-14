'use strict'
const expect = require('chai').expect
const spread = require('../../../lib/tasks/spread')

describe('spread', function () {
  describe('stampOffset', function () {
    it('should calculate offset (specific stamps)', async function () {
      const test = [
        { stamp: '2018-01-01T00:00:00Z', offset: 0 },
        { stamp: '2018-01-01T00:10:00Z', offset: 1 },
        { stamp: '2018-01-01T00:00:01.234Z', offset: 0 },
        { stamp: '2018-01-01T12:00:00Z', offset: 72 },
        { stamp: '2018-01-01T12:10:00Z', offset: 73 },
        { stamp: '2018-01-01T00:02:01.234Z', offset: 0 },
        { stamp: '2018-01-01T23:59:59.999Z', offset: 143 },
        { stamp: '2018-07-01T00:00:00Z', offset: 0 },
        { stamp: '2018-07-01T00:10:00Z', offset: 1 },
        { stamp: '2018-07-01T00:00:01.234Z', offset: 0 },
        { stamp: '2018-07-01T12:00:00Z', offset: 72 },
        { stamp: '2018-07-01T12:10:00Z', offset: 73 },
        { stamp: '2018-07-01T00:02:01.234Z', offset: 0 },
        { stamp: '2018-07-01T23:59:59.999Z', offset: 143 }
      ]
      for (const t of test) {
        const offset = spread.stampOffset(t.stamp)
        expect(offset).to.equal(t.offset)
      }
    })
    it('should calculate all offsets in [0,200)', async function () {
      for (let off = 0; off < 200; off++) {
        const stamp = new Date(
          +new Date('2018-07-01T00:00:00Z') + off * 10 * 60 * 1000
        ).toISOString()
        const expected = off % 144
        const offset = spread.stampOffset(stamp)
        expect(offset).to.equal(expected)
      }
    })
  })

  describe('uuidOffset', function () {
    it('should calculate offset (specific uidds)', async function () {
      const test = [
        {
          uuid: '00000000-0000-0000-0000-000000000000',
          offset: 138,
          alg: 'md5'
        },
        {
          uuid: '00000000-0000-0000-0000-000000000000',
          offset: 28,
          alg: 'sha256'
        },
        {
          uuid: 'e6e92380-2c46-012e-0984-00163e1b201c',
          offset: 124,
          alg: 'md5'
        },
        {
          uuid: 'e6e92380-2c46-012e-0984-00163e1b201c',
          offset: 130,
          alg: 'sha256'
        },
        {
          uuid: 'e4ff94b0-8686-0130-0b07-723c91aeae46',
          offset: 30,
          alg: 'md5'
        },
        {
          uuid: 'e4ff94b0-8686-0130-0b07-723c91aeae46',
          offset: 22,
          alg: 'sha256'
        },
        {
          uuid: 'e4b6efd0-0424-012e-f9a0-00163e1b201c',
          offset: 116,
          alg: 'md5'
        },
        {
          uuid: 'e4b6efd0-0424-012e-f9a0-00163e1b201c',
          offset: 52,
          alg: 'sha256'
        },
        {
          uuid: 'e0b82010-83df-012e-3c4d-00163e1b201c',
          offset: 38,
          alg: 'md5'
        },
        {
          uuid: 'e0b82010-83df-012e-3c4d-00163e1b201c',
          offset: 49,
          alg: 'sha256'
        },
        {
          uuid: 'df86cd70-5e91-0133-cd9f-0d11918ab357',
          offset: 46,
          alg: 'md5'
        },
        {
          uuid: 'df86cd70-5e91-0133-cd9f-0d11918ab357',
          offset: 61,
          alg: 'sha256'
        },
        {
          uuid: 'dde6abe0-04fe-012e-f9d3-00163e1b201c',
          offset: 11,
          alg: 'md5'
        },
        {
          uuid: 'dde6abe0-04fe-012e-f9d3-00163e1b201c',
          offset: 132,
          alg: 'sha256'
        },
        {
          uuid: 'bb16e6b0-1469-0134-a447-13e6b3913b15',
          offset: 114,
          alg: 'md5'
        },
        {
          uuid: 'bb16e6b0-1469-0134-a447-13e6b3913b15',
          offset: 41,
          alg: 'sha256'
        },
        {
          uuid: 'b4eb8a20-5ec6-012e-25a0-00163e1b201c',
          offset: 51,
          alg: 'md5'
        },
        {
          uuid: 'b4eb8a20-5ec6-012e-25a0-00163e1b201c',
          offset: 101,
          alg: 'sha256'
        },
        {
          uuid: 'b4d12f70-636c-0135-902c-63f4b61a9224',
          offset: 57,
          alg: 'md5'
        },
        {
          uuid: 'b4d12f70-636c-0135-902c-63f4b61a9224',
          offset: 141,
          alg: 'sha256'
        },
        {
          uuid: 'b1ccb690-fd97-0130-c6ee-723c91aeae46',
          offset: 79,
          alg: 'md5'
        },
        {
          uuid: 'b1ccb690-fd97-0130-c6ee-723c91aeae46',
          offset: 63,
          alg: 'sha256'
        },
        {
          uuid: 'ac371bd0-094f-0134-9ce1-59d98c6b72b8',
          offset: 36,
          alg: 'md5'
        },
        {
          uuid: 'ac371bd0-094f-0134-9ce1-59d98c6b72b8',
          offset: 119,
          alg: 'sha256'
        },
        {
          uuid: 'abb0ba60-2eac-0135-52f9-452518e2d253',
          offset: 37,
          alg: 'md5'
        },
        {
          uuid: 'abb0ba60-2eac-0135-52f9-452518e2d253',
          offset: 124,
          alg: 'sha256'
        },
        {
          uuid: 'a56c9e00-5332-0132-d11f-5f4c86fd3263',
          offset: 94,
          alg: 'md5'
        },
        {
          uuid: 'a56c9e00-5332-0132-d11f-5f4c86fd3263',
          offset: 87,
          alg: 'sha256'
        },
        {
          uuid: '9bae7500-ab3a-0133-2e1c-6dc413d6d41d',
          offset: 81,
          alg: 'md5'
        },
        {
          uuid: '9bae7500-ab3a-0133-2e1c-6dc413d6d41d',
          offset: 130,
          alg: 'sha256'
        },
        {
          uuid: '9a290c90-4a11-0135-902b-63f4b61a9224',
          offset: 127,
          alg: 'md5'
        },
        {
          uuid: '9a290c90-4a11-0135-902b-63f4b61a9224',
          offset: 140,
          alg: 'sha256'
        },
        {
          uuid: '97388eb0-db99-012e-da14-525400c11844',
          offset: 99,
          alg: 'md5'
        },
        {
          uuid: '97388eb0-db99-012e-da14-525400c11844',
          offset: 107,
          alg: 'sha256'
        },
        {
          uuid: '8d728390-249c-0131-73be-723c91aeae46',
          offset: 37,
          alg: 'md5'
        },
        {
          uuid: '8d728390-249c-0131-73be-723c91aeae46',
          offset: 34,
          alg: 'sha256'
        }
      ]
      for (const t of test) {
        const offset = spread.uuidOffset(t.uuid, { algorithm: t.alg })
        expect(offset).to.equal(t.offset)
        // console.log(`{ uuid: '${t.uuid}', offset: ${offset}, alg:'${t.alg}' },`)
      }
    })
    // eslint-disable-next-line mocha/no-skipped-tests
    it.skip('(deprecated parameter preModOffset) should calculate all preModOffsets in [0,200)', async function () {
      for (let off = 0; off < 200; off++) {
        // const t = { uuid: '00000000-0000-0000-0000-000000000000', offset: 28, alg: 'sha256' }
        const t = {
          uuid: '00000000-0000-0000-0000-000000000000',
          offset: 138,
          alg: 'md5'
        }

        const offset = spread.uuidOffset(t.uuid, {
          algorithm: t.alg,
          preModOffset: off
        })
        const expectedOffset = (t.offset + off) % 144
        expect(offset).to.equal(expectedOffset)
      }
    })
  })

  describe('select (deep,shallow,skip)', function () {
    it('should show select name', function () {
      expect(spread.selectName(0)).to.equal('deep')
      expect(spread.selectName(1)).to.equal('shallow')
      expect(spread.selectName(-1)).to.equal('skip')
    })
    describe('with offsets', function () {
      it('should correctly select with uuidOffset=0', function () {
        // this is the old cron behavior
        for (let stampOffset = 0; stampOffset < 144; stampOffset++) {
          const expected =
            stampOffset === 0
              ? 0 // deep
              : stampOffset % 6 === 0
              ? 1 // shallow
              : -1 // skip

          const selected = spread.selectFromOffsets(stampOffset, 0)
          expect(selected, `stampOffset ${stampOffset}`).to.equal(expected)
        }
      })
      it('should correctly select with uuidOffset=72', function () {
        // this is the old cron behavior
        for (let stampOffset = 0; stampOffset < 144; stampOffset++) {
          const expected =
            stampOffset === 72
              ? 0 // deep
              : stampOffset % 6 === 0
              ? 1 // shallow
              : -1 // skip

          const selected = spread.selectFromOffsets(stampOffset, 72)
          expect(selected, `stampOffset ${stampOffset}`).to.equal(expected)
        }
      })

      const test = [
        {
          uuidOffset: 0,
          deep: [0],
          shallow: [
            6, 12, 18, 24, 30, 36, 42, 48, 54, 60, 66, 72, 78, 84, 90, 96, 102,
            108, 114, 120, 126, 132, 138
          ]
        },
        {
          uuidOffset: 72,
          deep: [72],
          shallow: [
            0, 6, 12, 18, 24, 30, 36, 42, 48, 54, 60, 66, 78, 84, 90, 96, 102,
            108, 114, 120, 126, 132, 138
          ]
        },
        {
          uuidOffset: 7,
          deep: [7],
          shallow: [
            1, 13, 19, 25, 31, 37, 43, 49, 55, 61, 67, 73, 79, 85, 91, 97, 103,
            109, 115, 121, 127, 133, 139
          ]
        },
        {
          uuidOffset: 17,
          deep: [17],
          shallow: [
            5, 11, 23, 29, 35, 41, 47, 53, 59, 65, 71, 77, 83, 89, 95, 101, 107,
            113, 119, 125, 131, 137, 143
          ]
        },
        {
          uuidOffset: 89,
          deep: [89],
          shallow: [
            5, 11, 17, 23, 29, 35, 41, 47, 53, 59, 65, 71, 77, 83, 95, 101, 107,
            113, 119, 125, 131, 137, 143
          ]
        }
      ]
      for (const t of test) {
        it(`should correctly select with uuidOffset=${t.uuidOffset}`, function () {
          const deep = []
          const shallow = []
          for (let stampOffset = 0; stampOffset < 144; stampOffset++) {
            const selected = spread.selectFromOffsets(stampOffset, t.uuidOffset)
            if (selected === 0) {
              deep.push(stampOffset)
            } else if (selected === 1) {
              shallow.push(stampOffset)
            }
          }
          expect(deep, `${t.uuidOffset}`).to.deep.equal(t.deep)
          expect(shallow, `${t.uuidOffset}`).to.deep.equal(t.shallow)
        })
      }
    })
    describe('with stamps, uuids for day of 2018-02-23', function () {
      const test = [
        {
          uuid: '00000000-0000-0000-0000-000000000000', // 138
          deep: ['2018-02-23T23:00:00.000Z'],
          shallow: [
            '2018-02-23T00:00:00.000Z',
            '2018-02-23T01:00:00.000Z',
            '2018-02-23T02:00:00.000Z',
            '2018-02-23T03:00:00.000Z',
            '2018-02-23T04:00:00.000Z',
            '2018-02-23T05:00:00.000Z',
            '2018-02-23T06:00:00.000Z',
            '2018-02-23T07:00:00.000Z',
            '2018-02-23T08:00:00.000Z',
            '2018-02-23T09:00:00.000Z',
            '2018-02-23T10:00:00.000Z',
            '2018-02-23T11:00:00.000Z',
            '2018-02-23T12:00:00.000Z',
            '2018-02-23T13:00:00.000Z',
            '2018-02-23T14:00:00.000Z',
            '2018-02-23T15:00:00.000Z',
            '2018-02-23T16:00:00.000Z',
            '2018-02-23T17:00:00.000Z',
            '2018-02-23T18:00:00.000Z',
            '2018-02-23T19:00:00.000Z',
            '2018-02-23T20:00:00.000Z',
            '2018-02-23T21:00:00.000Z',
            '2018-02-23T22:00:00.000Z'
          ]
        },
        {
          uuid: 'e6e92380-2c46-012e-0984-00163e1b201c', // 124
          deep: ['2018-02-23T20:40:00.000Z'],
          shallow: [
            '2018-02-23T00:40:00.000Z',
            '2018-02-23T01:40:00.000Z',
            '2018-02-23T02:40:00.000Z',
            '2018-02-23T03:40:00.000Z',
            '2018-02-23T04:40:00.000Z',
            '2018-02-23T05:40:00.000Z',
            '2018-02-23T06:40:00.000Z',
            '2018-02-23T07:40:00.000Z',
            '2018-02-23T08:40:00.000Z',
            '2018-02-23T09:40:00.000Z',
            '2018-02-23T10:40:00.000Z',
            '2018-02-23T11:40:00.000Z',
            '2018-02-23T12:40:00.000Z',
            '2018-02-23T13:40:00.000Z',
            '2018-02-23T14:40:00.000Z',
            '2018-02-23T15:40:00.000Z',
            '2018-02-23T16:40:00.000Z',
            '2018-02-23T17:40:00.000Z',
            '2018-02-23T18:40:00.000Z',
            '2018-02-23T19:40:00.000Z',
            '2018-02-23T21:40:00.000Z',
            '2018-02-23T22:40:00.000Z',
            '2018-02-23T23:40:00.000Z'
          ]
        },
        {
          uuid: 'dde6abe0-04fe-012e-f9d3-00163e1b201c', // 11
          deep: ['2018-02-23T01:50:00.000Z'],
          shallow: [
            '2018-02-23T00:50:00.000Z',
            '2018-02-23T02:50:00.000Z',
            '2018-02-23T03:50:00.000Z',
            '2018-02-23T04:50:00.000Z',
            '2018-02-23T05:50:00.000Z',
            '2018-02-23T06:50:00.000Z',
            '2018-02-23T07:50:00.000Z',
            '2018-02-23T08:50:00.000Z',
            '2018-02-23T09:50:00.000Z',
            '2018-02-23T10:50:00.000Z',
            '2018-02-23T11:50:00.000Z',
            '2018-02-23T12:50:00.000Z',
            '2018-02-23T13:50:00.000Z',
            '2018-02-23T14:50:00.000Z',
            '2018-02-23T15:50:00.000Z',
            '2018-02-23T16:50:00.000Z',
            '2018-02-23T17:50:00.000Z',
            '2018-02-23T18:50:00.000Z',
            '2018-02-23T19:50:00.000Z',
            '2018-02-23T20:50:00.000Z',
            '2018-02-23T21:50:00.000Z',
            '2018-02-23T22:50:00.000Z',
            '2018-02-23T23:50:00.000Z'
          ]
        }
      ]
      for (const t of test) {
        it(`should correctly select with uuid=${t.uuid}`, function () {
          const deep = []
          const shallow = []
          for (let stampOffset = 0; stampOffset < 144; stampOffset++) {
            const stampMS =
              +new Date('2018-02-23T00:00:00Z') + stampOffset * 10 * 60 * 1000 // 10 minute bins
            const stamp = new Date(stampMS).toISOString()

            const selected = spread.select(stamp, t.uuid)
            // console.log({selected, stamp, uuid: t.uuid})
            if (selected === 0) {
              deep.push(stamp)
            } else if (selected === 1) {
              shallow.push(stamp)
            }
          }
          // console.log(JSON.stringify({uuid: t.uuid, deep, shallow}, null, 2))
          expect(deep, `${t.uuidOffset}`).to.deep.equal(t.deep)
          expect(shallow, `${t.uuidOffset}`).to.deep.equal(t.shallow)
        })
      }
    })
  })

  // eslint-disable-next-line mocha/no-skipped-tests
  describe.skip('simulations (skip)', function () {
    describe('find a uuid ', function () {
      const uuidDesiredOffset = 0
      const maxIterations = 1000
      it(`for offset == ${uuidDesiredOffset}`, function () {
        for (let u = 0; u < maxIterations; u++) {
          const uuid = require('sqlite3/node_modules/uuid').v4()
          const offset = spread.uuidOffset(uuid)
          if (offset === uuidDesiredOffset) {
            console.log(`        #${u} spread.uuidOffset('${uuid}')=${offset}`)
            break
          }
        }
      })
    })
    describe('random spread', function () {
      const maxRand = 144
      const samples = 100
      it(`randomly spread offset range ${maxRand}`, function () {
        const hh = new Histogram()

        for (let r = 0; r < samples; r++) {
          const offset = Math.floor(Math.random() * maxRand)
          expect(offset).to.be.at.least(0)
          expect(offset).to.be.below(maxRand)
          hh.add(offset)
        }
        console.log('      ', { offsetCounts: JSON.stringify(hh.offsetCounts) })
        console.log('      ', { histo: hh.histogram() })
      })
    })

    describe('max page/items per salt', function () {
      //  conclusion: not necessary...
      // calculates max and average, for pages and items, trying to add salt to uuid hash
      // runs for all salts from 0x0000-0xffff
      // takes 3 minutes to run
      // simulation paramters:
      const byteRange = [12, 8, 4]
      const hashAlgorithms = ['sha256', 'md5']
      it('shoud spread out scrape offsets with hash salt', function () {
        this.timeout(5 * 60 * 1000) // 5 minutes
        let minPages = 1e9
        let minItems = 1e9
        for (const numBytes of byteRange) {
          for (const algorithm of hashAlgorithms) {
            for (let iteration = 0; iteration <= 0xffff; iteration++) {
              const salt = iteration.toString(16).padStart(4, '0')

              const itz = new Itemizer()
              for (const { user, podcasts } of podcastData) {
                // console.log({user, podcasts: podcasts.length})
                for (const { uuid, items } of podcasts) {
                  const uuidAndSalt = uuid + salt
                  // console.log('  ', {uuidAndSalt, items})
                  const offset = spread.uuidOffset(uuidAndSalt + user, {
                    algorithm,
                    numBytes
                  })

                  itz.addDeep(offset, items)
                  for (let secondary = 6; secondary < 144; secondary += 6) {
                    const mod = (offset + secondary) % 144
                    itz.addShallow(mod, items)
                  }
                }
              }
              const ma = itz.maxAndAverage()
              const line = JSON.stringify({
                numBytes,
                algorithm,
                salt,
                ...ma
              }).replace(/"/g, '')
              // console.log(line)
              if (minPages >= ma.pages.max) {
                minPages = ma.pages.max
                console.log(line, '<-- new min pages')
              }
              if (minItems >= ma.items.max) {
                minItems = ma.items.max
                console.log(line, '<-- new min items')
              }
            }
          }
        }
      })
    })
  })
})

// helpers
class Itemizer {
  // counts pages and items, per offset bin (10minutes intervals)
  constructor() {
    this.itemCounts = array144()
    this.pageCounts = array144()
  }

  maxAndAverage() {
    return {
      items: maxAndAverage(this.itemCounts),
      pages: maxAndAverage(this.pageCounts)
    }
  }

  addDeep(offset, items) {
    this.addItems(offset, items)
  }

  addShallow(offset, items) {
    this.addItems(offset, Math.min(items, 100)) // implies only first page
  }

  addItems(offset, items) {
    const pageSize = 100
    this.itemCounts[offset] += items
    this.pageCounts[offset] += Math.ceil(items / pageSize)
  }
}
class Histogram {
  // counts hits, per offset bin (10minutes intervals)
  // histogram method return the number of bins which have 0,1,2,3,.. hts
  constructor() {
    this.offsetCounts = array144()
  }

  add(offset) {
    this.offsetCounts[offset]++
  }

  histogram() {
    return histogram(this.offsetCounts)
  }
}

function array144() {
  return Array.apply(null, Array(144)).map((x) => 0)
}

function histogram(values) {
  const histo = values.reduce((histo, count) => {
    const countStr = `${count}`
    // console.log('--', {histo, count})
    histo[countStr] = histo[countStr] || 0
    histo[countStr]++
    return histo
  }, {})
  return histo
}

function maxAndAverage(counts) {
  const ma = counts.reduce(
    (ma, count) => {
      if (count > ma.max) {
        ma.max = count
      }
      ma.avg += count
      return ma
    },
    { max: 0, avg: 0 }
  )
  ma.avg /= counts.length
  ma.avg = Math.round(ma.avg)
  return ma
}

// reference Data
const podcastData = [
  {
    user: 'stephane',
    podcasts: [
      { uuid: '052df5e0-72b8-012f-1d57-525400c11844', items: 150 },
      { uuid: 'f5b97290-0422-012e-f9a0-00163e1b201c', items: 149 },
      { uuid: 'f4d1adb0-ccd1-0131-2dc0-723c91aeae46', items: 98 },
      { uuid: 'f3324830-ac93-0130-24f4-723c91aeae46', items: 50 },
      { uuid: 'ede41160-9eeb-012f-3e7d-525400c11844', items: 250 },
      { uuid: 'e0b82010-83df-012e-3c4d-00163e1b201c', items: 30 },
      { uuid: 'dc0f58f0-e3b7-012f-94fb-723c91aeae46', items: 94 },
      { uuid: 'cd0a73b0-7c27-012f-236b-525400c11844', items: 1656 },
      { uuid: 'c22cf980-b963-0134-10a8-25324e2a541d', items: 20 },
      { uuid: 'bb16e6b0-1469-0134-a447-13e6b3913b15', items: 44 },
      { uuid: 'b4eb8a20-5ec6-012e-25a0-00163e1b201c', items: 371 },
      { uuid: 'b4d12f70-636c-0135-902c-63f4b61a9224', items: 29 },
      { uuid: 'b1ccb690-fd97-0130-c6ee-723c91aeae46', items: 199 },
      { uuid: 'ac371bd0-094f-0134-9ce1-59d98c6b72b8', items: 22 },
      { uuid: 'abb0ba60-2eac-0135-52f9-452518e2d253', items: 15 },
      { uuid: 'a56c9e00-5332-0132-d11f-5f4c86fd3263', items: 60 },
      { uuid: '9bae7500-ab3a-0133-2e1c-6dc413d6d41d', items: 75 },
      { uuid: '9a290c90-4a11-0135-902b-63f4b61a9224', items: 10 },
      { uuid: '97388eb0-db99-012e-da14-525400c11844', items: 123 },
      { uuid: '8d728390-249c-0131-73be-723c91aeae46', items: 122 },
      { uuid: '8c2e4060-1a2e-012e-fff0-00163e1b201c', items: 26 },
      { uuid: '873e7420-042d-012e-f9a4-00163e1b201c', items: 1167 },
      { uuid: '86e084d0-1dae-012e-01b5-00163e1b201c', items: 28 },
      { uuid: '7fe8c5d0-118f-0131-69e9-723c91aeae46', items: 100 },
      { uuid: '77734670-5fba-0133-ce2c-0d11918ab357', items: 115 },
      { uuid: '71ec6530-6cc1-0134-787d-4ffec63d9550', items: 63 },
      { uuid: '70d13d50-9efe-0130-1b90-723c91aeae46', items: 286 },
      { uuid: '6d23f7b0-0969-0132-a5f9-5f4c86fd3263', items: 158 },
      { uuid: '650a7fd0-c449-0135-9e60-5bb073f92b78', items: 2 },
      { uuid: '632c1e80-d414-0132-034c-059c869cc4eb', items: 142 },
      { uuid: '62e4f060-ec96-0133-9c5b-59d98c6b72b8', items: 56 },
      { uuid: '56d400d0-242c-0133-b026-0d11918ab357', items: 122 },
      { uuid: '566fbb40-6020-0131-740c-723c91aeae46', items: 236 },
      { uuid: '489621e0-00c8-0134-9c92-59d98c6b72b8', items: 66 },
      { uuid: '3ec78c50-0d62-012e-fb9c-00163e1b201c', items: 12 },
      { uuid: '3a31d830-06bf-0134-9ce1-59d98c6b72b8', items: 25 },
      { uuid: '3782b780-0bc5-012e-fb02-00163e1b201c', items: 4 },
      { uuid: '359848b0-c0fe-0132-381c-0b39892d38e0', items: 40 },
      { uuid: '33853ee0-e512-0134-ec12-4114446340cb', items: 13 },
      { uuid: '31348450-4eaa-012f-0c20-525400c11844', items: 155 },
      { uuid: '2fca8620-6c96-0134-787d-4ffec63d9550', items: 60 },
      { uuid: '2ef30b90-f615-012e-e4e5-525400c11844', items: 232 },
      { uuid: '2d4e1b90-fb19-0133-9c92-59d98c6b72b8', items: 63 },
      { uuid: '2cfd8eb0-58b1-012f-101d-525400c11844', items: 116 },
      { uuid: '2743d720-0edf-0133-2204-059c869cc4eb', items: 100 },
      { uuid: '27284b30-d9fa-0131-37b0-723c91aeae46', items: 201 },
      { uuid: '22278830-d9be-0134-ebdd-4114446340cb', items: 24 },
      { uuid: '20a7ca40-9128-0131-8b7f-723c91aeae46', items: 250 },
      { uuid: '1efbcba0-7592-0132-e061-5f4c86fd3263', items: 52 },
      { uuid: '1dbc2230-2b82-012e-0915-00163e1b201c', items: 50 },
      { uuid: '18910720-189c-0132-b004-5f4c86fd3263', items: 250 },
      { uuid: '0cc43410-1d2f-012e-0175-00163e1b201c', items: 315 },
      { uuid: '05ccf3c0-1b97-012e-00b7-00163e1b201c', items: 25 }
    ]
  },
  {
    user: 'daniel',
    podcasts: [
      { uuid: '002e29f0-dc34-0132-080d-059c869cc4eb', items: 29 },
      { uuid: 'f5b97290-0422-012e-f9a0-00163e1b201c', items: 149 },
      { uuid: 'eedd5f90-b1b8-0130-2756-723c91aeae46', items: 115 },
      { uuid: 'ede41160-9eeb-012f-3e7d-525400c11844', items: 250 },
      { uuid: 'ec18bbd0-0426-012e-f9a0-00163e1b201c', items: 30 },
      { uuid: 'e6eb8660-0425-012e-f9a0-00163e1b201c', items: 612 },
      { uuid: 'e6e92380-2c46-012e-0984-00163e1b201c', items: 10 },
      { uuid: 'e4ff94b0-8686-0130-0b07-723c91aeae46', items: 4 },
      { uuid: 'e4b6efd0-0424-012e-f9a0-00163e1b201c', items: 192 },
      { uuid: 'e0b82010-83df-012e-3c4d-00163e1b201c', items: 30 },
      { uuid: 'df86cd70-5e91-0133-cd9f-0d11918ab357', items: 193 },
      { uuid: 'dde6abe0-04fe-012e-f9d3-00163e1b201c', items: 339 },
      { uuid: 'dc2ac100-3c51-0133-bc8e-0d11918ab357', items: 12 },
      { uuid: 'd953d3a0-15ab-012f-f37c-525400c11844', items: 42 },
      { uuid: 'd81fbcb0-0422-012e-f9a0-00163e1b201c', items: 387 },
      { uuid: 'd7adf010-b50e-0133-2e57-6dc413d6d41d', items: 2 },
      { uuid: 'd450fed0-bf28-0133-2e7c-6dc413d6d41d', items: 5 },
      { uuid: 'd22cc180-0dc1-012e-fbb9-00163e1b201c', items: 492 },
      { uuid: 'c91eec00-0423-012e-f9a0-00163e1b201c', items: 319 },
      { uuid: 'c84870c0-906a-012f-3312-525400c11844', items: 78 },
      { uuid: 'c3adff20-1b2f-012e-0081-00163e1b201c', items: 50 },
      { uuid: 'c0313510-8262-0132-e7ff-5f4c86fd3263', items: 85 },
      { uuid: 'bc383e00-0425-012e-f9a0-00163e1b201c', items: 15 },
      { uuid: 'b9111820-79bb-0132-e4d9-5f4c86fd3263', items: 299 },
      { uuid: 'b633aa60-0bfe-012e-fb1f-00163e1b201c', items: 49 },
      { uuid: 'b618d3d0-960d-0132-f2e4-5f4c86fd3263', items: 1 },
      { uuid: 'b4eb8a20-5ec6-012e-25a0-00163e1b201c', items: 371 },
      { uuid: 'b4d12f70-636c-0135-902c-63f4b61a9224', items: 29 },
      { uuid: 'b1ccb690-fd97-0130-c6ee-723c91aeae46', items: 199 },
      { uuid: 'b0f7c190-9173-012f-33de-525400c11844', items: 139 },
      { uuid: 'aeddb420-7217-0133-2cee-6dc413d6d41d', items: 200 },
      { uuid: 'ac371bd0-094f-0134-9ce1-59d98c6b72b8', items: 22 },
      { uuid: 'abb0ba60-2eac-0135-52f9-452518e2d253', items: 15 },
      { uuid: 'a98ead50-f0fe-0132-1156-059c869cc4eb', items: 77 },
      { uuid: 'a56c9e00-5332-0132-d11f-5f4c86fd3263', items: 60 },
      { uuid: 'a4732ee0-a19b-0134-9123-3327a14bcdba', items: 13 },
      { uuid: 'a2de39a0-7660-0130-ffe2-723c91aeae46', items: 39 },
      { uuid: 'a0d69a80-04e7-0132-a2c3-5f4c86fd3263', items: 6 },
      { uuid: '9f51f2c0-8fbc-0130-1069-723c91aeae46', items: 20 },
      { uuid: '9d6076d0-3bd2-0134-eba6-0d50f522381b', items: 27 },
      { uuid: '9c2dc2e0-a570-0135-9e26-5bb073f92b78', items: 9 },
      { uuid: '976c2fc0-1c0e-012e-00fd-00163e1b201c', items: 100 },
      { uuid: '96cc52a0-b25e-0133-2e49-6dc413d6d41d', items: 42 },
      { uuid: '958b1150-0429-012e-f9a0-00163e1b201c', items: 105 },
      { uuid: '8fc91c30-03a7-0134-9c92-59d98c6b72b8', items: 127 },
      { uuid: '8ea0e990-390d-0131-77d4-723c91aeae46', items: 86 },
      { uuid: '8d728390-249c-0131-73be-723c91aeae46', items: 122 },
      { uuid: '8cf9f110-fdee-012e-e8c1-525400c11844', items: 87 },
      { uuid: '8c556e80-113d-0134-a447-13e6b3913b15', items: 15 },
      { uuid: '8c4c6bd0-a696-012f-4480-525400c11844', items: 16 },
      { uuid: '8afe50a0-0427-012e-f9a0-00163e1b201c', items: 12 },
      { uuid: '89beea90-5edf-012e-25b7-00163e1b201c', items: 0 },
      { uuid: '873e7420-042d-012e-f9a4-00163e1b201c', items: 1167 },
      { uuid: '85f383f0-1e6a-012e-0210-00163e1b201c', items: 102 },
      { uuid: '837bf210-041f-012e-f99f-00163e1b201c', items: 141 },
      { uuid: '80931490-01be-0132-a0fb-5f4c86fd3263', items: 204 },
      { uuid: '7d16cee0-1c1c-0133-28b1-059c869cc4eb', items: 119 },
      { uuid: '7b28dcf0-e564-012e-dda0-525400c11844', items: 10 },
      { uuid: '781f3ec0-3d3b-0134-eba6-0d50f522381b', items: 20 },
      { uuid: '77734670-5fba-0133-ce2c-0d11918ab357', items: 115 },
      { uuid: '77170eb0-0257-012e-f994-00163e1b201c', items: 1563 },
      { uuid: '74a35900-0423-012e-f9a0-00163e1b201c', items: 54 },
      { uuid: '70d13d50-9efe-0130-1b90-723c91aeae46', items: 286 },
      { uuid: '6d23f7b0-0969-0132-a5f9-5f4c86fd3263', items: 158 },
      { uuid: '66084f00-c6b1-0130-34d2-723c91aeae46', items: 229 },
      { uuid: '650a7fd0-c449-0135-9e60-5bb073f92b78', items: 2 },
      { uuid: '64a62690-dcdd-0134-ebdd-4114446340cb', items: 22 },
      { uuid: '62e4f060-ec96-0133-9c5b-59d98c6b72b8', items: 56 },
      { uuid: '5e6125f0-0424-012e-f9a0-00163e1b201c', items: 300 },
      { uuid: '5e27c480-3fcb-0133-be19-0d11918ab357', items: 59 },
      { uuid: '5e0e0e70-0c4f-012e-fb35-00163e1b201c', items: 544 },
      { uuid: '5bbc3e50-026e-0131-c9c5-723c91aeae46', items: 238 },
      { uuid: '58b79440-1f1f-0131-6ebd-723c91aeae46', items: 352 },
      { uuid: '566fbb40-6020-0131-740c-723c91aeae46', items: 236 },
      { uuid: '55c51e50-3318-012e-0d51-00163e1b201c', items: 26 },
      { uuid: '53678a10-bc45-0134-10a8-25324e2a541d', items: 52 },
      { uuid: '52b13ce0-0d7b-012e-fba4-00163e1b201c', items: 1314 },
      { uuid: '52905800-287d-012e-0725-00163e1b201c', items: 155 },
      { uuid: '4fa94560-79e8-0135-9036-63f4b61a9224', items: 50 },
      { uuid: '4af9a900-9f4c-0130-1bc0-723c91aeae46', items: 233 },
      { uuid: '489621e0-00c8-0134-9c92-59d98c6b72b8', items: 66 },
      { uuid: '44557c00-40b4-0131-77d4-723c91aeae46', items: 102 },
      { uuid: '421c79d0-0423-012e-f9a0-00163e1b201c', items: 300 },
      { uuid: '42150f70-c66f-012f-7e7a-723c91aeae46', items: 265 },
      { uuid: '40d36c30-5580-0131-828c-723c91aeae46', items: 120 },
      { uuid: '3ec78c50-0d62-012e-fb9c-00163e1b201c', items: 12 },
      { uuid: '3920d880-1b97-012e-00b9-00163e1b201c', items: 25 },
      { uuid: '359848b0-c0fe-0132-381c-0b39892d38e0', items: 40 },
      { uuid: '30c3aff0-eed5-012e-e176-525400c11844', items: 59 },
      { uuid: '30c2cb40-0256-012e-f994-00163e1b201c', items: 391 },
      { uuid: '2cfd8eb0-58b1-012f-101d-525400c11844', items: 116 },
      { uuid: '278554c0-0bef-012e-fb16-00163e1b201c', items: 10 },
      { uuid: '2743d720-0edf-0133-2204-059c869cc4eb', items: 100 },
      { uuid: '27284b30-d9fa-0131-37b0-723c91aeae46', items: 201 },
      { uuid: '2645cf10-1b93-012e-00b7-00163e1b201c', items: 24 },
      { uuid: '262069e0-e7df-0132-0ef7-059c869cc4eb', items: 767 },
      { uuid: '25ca21a0-85c2-012e-3eb7-00163e1b201c', items: 122 },
      { uuid: '2433b8f0-0d4c-012e-fb96-00163e1b201c', items: 940 },
      { uuid: '220196b0-5d6e-012e-2467-00163e1b201c', items: 215 },
      { uuid: '1dbc2230-2b82-012e-0915-00163e1b201c', items: 50 },
      { uuid: '17620ce0-77b4-0130-0031-723c91aeae46', items: 46 },
      { uuid: '14cd6d90-0cc4-012e-fb69-00163e1b201c', items: 296 },
      { uuid: '0fb72d80-4c95-0130-e3d5-723c91aeae46', items: 100 },
      { uuid: '0cc43410-1d2f-012e-0175-00163e1b201c', items: 315 },
      { uuid: '07c07770-1727-012e-feea-00163e1b201c', items: 322 },
      { uuid: '05ccf3c0-1b97-012e-00b7-00163e1b201c', items: 25 }
    ]
  }
]
