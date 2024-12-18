'use strict'
const expect = require('chai').expect
const sinon = require('sinon')

const orm = require('../../../lib/model/orm')
const db = require('../../../lib/store/db')
const helpers = require('../../helpers')

describe('store', function () {
  // this.timeout(20000)
  before(async function () {
    if (process.env.NODE_ENV !== 'test') {
      throw new Error(
        'Tests must be run with NODE_ENV==test to ensure data safety'
      )
    }
    await orm.init() // side effect creates storage directory for sqlite
  })
  beforeEach(async function () {
    await orm.sequelize.dropAllSchemas()
    await orm.sequelize.sync({ force: true })
  })

  describe('db', function () {
    // eslint-disable-next-line mocha/no-skipped-tests
    it.skip('should initialise (open connections) the store', async function () {})
    // eslint-disable-next-line mocha/no-skipped-tests
    it.skip('should end (close connections) the store', async function () {})
    it('should save an item', async function () {
      const item = helpers.makeItem(1)
      const ok = await db.save(item)
      expect(ok).to.equal(true)

      const got = await db.getByDigest(db._digest(item))
      expect(got).to.deep.equal(item)
    })
    it('should save an item without error if it already exists', async function () {
      const item1 = helpers.makeItem(1)
      const ok1 = await db.save(item1)
      expect(ok1).to.equal(true)

      const item2 = helpers.makeItem(1)
      const ok2 = await db.save(item2)
      expect(ok2).to.equal(true)

      const got = await db.getByDigest(db._digest(item2))
      expect(got).to.deep.equal(item1)
      expect(got).to.deep.equal(item2)
    })

    it('should saveAll', async function () {
      const items = helpers.makeItems([1, 2, 3])
      const ok = await db.saveAll(items)
      expect(ok).to.equal(true)

      const got = await db.digests({})
      expect(got).to.deep.equal([
        '2a87b34d35438cf1a0b696898f075b9cdcb156698f7edf86e337a220c92c0a22',
        '4c01804183b5f842c4b30407d2d117d1419e2a8e05ca7e986511497639f6c84a',
        '2eaafe32f069588325a2487f23999506b5619f3c0e8a7113f7effa511dd95173'
      ])
    })

    // invoke item-wise save on duplicates
    // which I think is impossible because of deduplidcation
    // so actually should test that filtered has only 1 item in second save
    it('should saveAll with duplicates', async function () {
      const items = helpers.makeItems([1, 2])
      const ok = await db.saveAll(items)
      expect(ok).to.equal(true)

      // has 1 duplicate with first batch
      const items2 = helpers.makeItems([2, 3])
      const ok2 = await db.saveAll(items2)
      // expect save(item) to have been called
      expect(ok2).to.equal(true)

      const got = await db.digests({})
      expect(got).to.deep.equal([
        '2a87b34d35438cf1a0b696898f075b9cdcb156698f7edf86e337a220c92c0a22',
        '4c01804183b5f842c4b30407d2d117d1419e2a8e05ca7e986511497639f6c84a',
        '2eaafe32f069588325a2487f23999506b5619f3c0e8a7113f7effa511dd95173'
      ])
    })

    it('should saveByBatch is correct', async function () {
      const items = helpers.makeItems([1, 2, 3, 4])
      const saver = await db.saveByBatch(3)
      for (const item of items) {
        const ok = await saver(item)
        expect(ok).to.equal(true)
      }
      // don't forget to flush()!
      const ok = await saver.flush()
      expect(ok).to.equal(true)

      const got = await db.digests({})
      expect(got).to.deep.equal([
        'b6029b4fe3cc47c68c5611e01d315a4be20fb3a39304b4255567a40bacc9b3ca',
        '2a87b34d35438cf1a0b696898f075b9cdcb156698f7edf86e337a220c92c0a22',
        '4c01804183b5f842c4b30407d2d117d1419e2a8e05ca7e986511497639f6c84a',
        '2eaafe32f069588325a2487f23999506b5619f3c0e8a7113f7effa511dd95173'
      ])
    })

    // use spy to confirm saveAll called once per batch
    // TODO(daneroo): cannot decorate the inner implemtation of flush or saveAll
    it('should saveByBatch with spies', async function () {
      const items = helpers.makeItems([1, 2, 3, 4])
      const saver = sinon.spy(db.saveByBatch(3))
      sinon.spy(saver, 'flush')

      for (const item of items) {
        const ok = await saver(item)
        expect(ok).to.equal(true)
      }
      // don't forget to flush()!
      const ok = await saver.flush()
      expect(ok).to.equal(true)

      expect(saver.callCount, 'saver called 4 times').to.equal(4)
      // TODO(daneroo): This spy is only called once, but the inner flush method is actually called twice
      //   - how can we assert that!
      expect(saver.flush.callCount, 'flush called once').to.equal(1)

      // remove the spy
      saver.flush.restore()

      const got = await db.digests({})
      expect(got).to.deep.equal([
        'b6029b4fe3cc47c68c5611e01d315a4be20fb3a39304b4255567a40bacc9b3ca',
        '2a87b34d35438cf1a0b696898f075b9cdcb156698f7edf86e337a220c92c0a22',
        '4c01804183b5f842c4b30407d2d117d1419e2a8e05ca7e986511497639f6c84a',
        '2eaafe32f069588325a2487f23999506b5619f3c0e8a7113f7effa511dd95173'
      ])
    })

    it('should load and handle each item in the right order (snapshot|file)', async function () {
      // create in inverse order as expected to be load'ed
      const items = helpers.makeItems([3, 2, 1])
      const ok = await db.saveAll(items)
      expect(ok).to.equal(true)

      const handler = sinon.spy()
      await db.load({ user: 'mock', order: db.fieldOrders.snapshot }, handler)

      expect(handler.callCount, 'handler called thrice').to.equal(3)
      // ensure call order is __stamp ascending
      expect(
        handler.getCall(0).args[0].item,
        'handler called 1st with item 2'
      ).to.deep.equal(items[2])
      expect(
        handler.getCall(1).args[0].item,
        'handler called 2nd with item 1'
      ).to.deep.equal(items[1])
      expect(
        handler.getCall(2).args[0].item,
        'handler called 3rd with item 0'
      ).to.deep.equal(items[0])
    })
    it('should load and handle each item in the right order (dedup|default)', async function () {
      // create in invers order as expected to be load'ed
      const items = helpers.makeItems([3, 2, 1])
      // adjust data to show uuid,stamp ordering
      items[0].uuid = 'episode-0001'
      items[1].uuid = 'episode-0002'
      items[2].uuid = 'episode-0001'
      const ok = await db.saveAll(items)
      expect(ok).to.equal(true)

      const handler = sinon.spy()
      await db.load({ user: 'mock' }, handler)

      expect(handler.callCount, 'handler called thrice').to.equal(3)
      // ensure call order is __stamp ascending
      expect(
        handler.getCall(0).args[0].item,
        'handler called 1st with item 2'
      ).to.deep.equal(items[2])
      expect(
        handler.getCall(1).args[0].item,
        'handler called 2nd with item 0'
      ).to.deep.equal(items[0])
      expect(
        handler.getCall(2).args[0].item,
        'handler called 3rd with item 1'
      ).to.deep.equal(items[1])
    })

    it('should load with appropriate filter by __user', async function () {
      const items = helpers.makeItems([1, 2])
      const ok = await db.saveAll(items)
      expect(ok).to.equal(true)

      const handler = sinon.spy()

      await db.load({ user: 'not-mock' }, handler)
      expect(handler.callCount, 'handler not be called').to.equal(0)
    })

    it('should throw an error if load has missing user property', async function () {
      const items = helpers.makeItems([1, 2])
      const ok = await db.saveAll(items)
      expect(ok).to.equal(true)

      const handler = sinon.spy()

      try {
        await db.load({}, handler)
        throw new Error('should not reach this')
      } catch (err) {
        expect(err.message).to.equal('db:load missing required user property')
      }
      expect(handler.callCount, 'handler not be called').to.equal(0)
    })

    it('should getByDigest when exists', async function () {
      const item = helpers.makeItem(1)
      const ok = await db.save(item)
      expect(ok).to.equal(true)

      const got = await db.getByDigest(db._digest(item))
      expect(got).to.deep.equal(item)
    })

    it('should return null when getByDigest not found', async function () {
      const notexist = helpers.makeItem(2)
      const got = await db.getByDigest(db._digest(notexist))
      expect(got).to.equal(null)
    })

    it('should get digests', async function () {
      const items = helpers.makeItems([1, 2, 3, 4])
      await db.saveAll(items)

      const got = await db.digests({})
      expect(got).to.deep.equal([
        'b6029b4fe3cc47c68c5611e01d315a4be20fb3a39304b4255567a40bacc9b3ca',
        '2a87b34d35438cf1a0b696898f075b9cdcb156698f7edf86e337a220c92c0a22',
        '4c01804183b5f842c4b30407d2d117d1419e2a8e05ca7e986511497639f6c84a',
        '2eaafe32f069588325a2487f23999506b5619f3c0e8a7113f7effa511dd95173'
      ])
    })
    it('should get digests with time ranges', async function () {
      const items = helpers.makeItems([1, 2, 3, 4])
      // console.log('makeItems', items)
      await db.saveAll(items)

      const data = [
        {
          name: 'no range specifiers',
          args: {},
          expected: [
            'b6029b4fe3cc47c68c5611e01d315a4be20fb3a39304b4255567a40bacc9b3ca', // 2017-06-04T00:00:00Z
            '2a87b34d35438cf1a0b696898f075b9cdcb156698f7edf86e337a220c92c0a22', // 2017-06-03T00:00:00Z
            '4c01804183b5f842c4b30407d2d117d1419e2a8e05ca7e986511497639f6c84a', // 2017-06-02T00:00:00Z
            '2eaafe32f069588325a2487f23999506b5619f3c0e8a7113f7effa511dd95173' // 2017-06-01T00:00:00Z
          ]
        },
        {
          name: 'just since',
          args: { since: '2017-06-02T00:00:00Z' },
          expected: [
            'b6029b4fe3cc47c68c5611e01d315a4be20fb3a39304b4255567a40bacc9b3ca', // 2017-06-04T00:00:00Z
            '2a87b34d35438cf1a0b696898f075b9cdcb156698f7edf86e337a220c92c0a22', // 2017-06-03T00:00:00Z
            '4c01804183b5f842c4b30407d2d117d1419e2a8e05ca7e986511497639f6c84a' // 2017-06-02T00:00:00Z
          ]
        },
        {
          name: 'just before',
          args: { before: '2017-06-04T00:00:00Z' },
          expected: [
            '2a87b34d35438cf1a0b696898f075b9cdcb156698f7edf86e337a220c92c0a22', // 2017-06-03T00:00:00Z
            '4c01804183b5f842c4b30407d2d117d1419e2a8e05ca7e986511497639f6c84a', // 2017-06-02T00:00:00Z
            '2eaafe32f069588325a2487f23999506b5619f3c0e8a7113f7effa511dd95173' // 2017-06-01T00:00:00Z
          ]
        },
        {
          name: 'since and before',
          args: {
            since: '2017-06-02T00:00:00Z',
            before: '2017-06-04T00:00:00Z'
          },
          expected: [
            '2a87b34d35438cf1a0b696898f075b9cdcb156698f7edf86e337a220c92c0a22', // 2017-06-03T00:00:00Z
            '4c01804183b5f842c4b30407d2d117d1419e2a8e05ca7e986511497639f6c84a' // 2017-06-02T00:00:00Z
          ]
        },
        {
          name: 'empty (since > before)',
          args: {
            since: '2017-06-04T00:00:00Z',
            before: '2017-06-02T00:00:00Z'
          },
          expected: []
        }
      ]

      for (let i = 0; i < data.length; i++) {
        const test = data[i]
        const got = await db.digests(test.args)
        expect(got, test.name).to.deep.equal(test.expected)
      }
    })

    it('should get digests of digests', async function () {
      const items = helpers.makeItems([1, 2, 3, 4])
      await db.saveAll(items)

      const got = await db.digestOfDigests()
      expect(got).to.equal(
        '084bb7cb8df1c14bbb672ff64de3eb8e191468ef6db9b1ac68c577c60b01f7e4'
      )
    })

    it('should get digest of digests for empty array', async function () {
      // No items saved - empty database
      const got = await db.digestOfDigests()
      // This should match sha256('[]')
      expect(got).to.equal(
        '4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945'
      )
    })

    // This was to test deprecation notice of getByKey
    // it.skip('should thrown an error when deprecated getByKey is called', async () => {
    //   const item = helpers.makeItem(1)
    //   try {
    //     /* const got = */ await db.getByKey(item)
    //     throw (new Error('should not reach this'))
    //   } catch (err) {
    //     expect(err.message).to.equal('db::getByKey deprecated')
    //   }
    // })

    it('should find an item with getByKey', async function () {
      const item = helpers.makeItem(1)
      const ok = await db.save(item)
      expect(ok).to.equal(true)

      const got = await db.getByKey(item)
      expect(got).to.deep.equal(item)
    })
    it('should return null getByKey(item) is not found', async function () {
      const item = helpers.makeItem(2)
      try {
        const got = await db.getByKey(item)
        expect(got).to.equal(null)
      } catch (err) {
        throw new Error('should not reach this')
      }
    })

    it("should remove an item if it exists and if it does'nt", async function () {
      const items = helpers.makeItems([1, 2])
      const ok = await db.saveAll(items)
      expect(ok).to.equal(true)

      expect(await db.digests()).to.deep.equal([
        '4c01804183b5f842c4b30407d2d117d1419e2a8e05ca7e986511497639f6c84a', // 2
        '2eaafe32f069588325a2487f23999506b5619f3c0e8a7113f7effa511dd95173' // 1
      ])

      // Remove first item
      let count = await db.remove(items[0])
      expect(count).to.equal(1)

      expect(await db.digests()).to.deep.equal([
        '4c01804183b5f842c4b30407d2d117d1419e2a8e05ca7e986511497639f6c84a' // 2
      ])

      // Remove first item again: count:0
      count = await db.remove(items[0])
      expect(count).to.equal(0)

      expect(await db.digests()).to.deep.equal([
        '4c01804183b5f842c4b30407d2d117d1419e2a8e05ca7e986511497639f6c84a' // 2
      ])

      // Remove second item
      count = await db.remove(items[1])
      expect(count).to.equal(1)

      expect(await db.digests()).to.deep.equal([])
    })

    it('should remove an multiple items even if some are not present', async function () {
      const items = helpers.makeItems([0, 1, 2, 3, 4, 5, 6, 7])
      const ok = await db.saveAll(items)
      expect(ok).to.equal(true)

      expect(await db.digests()).to.deep.equal([
        'f6015930b9b4c8dfeaec33902f835711407fa3e0ad63f7c4daafeaa3b55c505a', // 7
        '744a820f0ad761a17b5620233d79ee4588c3b1de46c18b0fc93547929f57fa84', // 6
        '053f344178c6d150a6644a1a673dff97227f341f6f08ad693a2399af5b4bf081', // 5
        'b6029b4fe3cc47c68c5611e01d315a4be20fb3a39304b4255567a40bacc9b3ca', // 4
        '2a87b34d35438cf1a0b696898f075b9cdcb156698f7edf86e337a220c92c0a22', // 3
        '4c01804183b5f842c4b30407d2d117d1419e2a8e05ca7e986511497639f6c84a', // 2
        '2eaafe32f069588325a2487f23999506b5619f3c0e8a7113f7effa511dd95173', // 1
        '39b3d1263027fefa1b881599a099e9096a5cdab12eb156f336225de68e747f62' // 0
      ])

      // removeAll(2,4,6) // items[1,3,5]
      let count = await db.removeAll([2, 4, 6].map((i) => items[i]))
      expect(count).to.equal(3)
      expect(await db.digests()).to.deep.equal([
        'f6015930b9b4c8dfeaec33902f835711407fa3e0ad63f7c4daafeaa3b55c505a', // 7
        '053f344178c6d150a6644a1a673dff97227f341f6f08ad693a2399af5b4bf081', // 5
        '2a87b34d35438cf1a0b696898f075b9cdcb156698f7edf86e337a220c92c0a22', // 3
        '2eaafe32f069588325a2487f23999506b5619f3c0e8a7113f7effa511dd95173', // 1
        '39b3d1263027fefa1b881599a099e9096a5cdab12eb156f336225de68e747f62' // 0
      ])

      // removeAll(2,3,4,5,6) // items
      count = await db.removeAll([2, 3, 4, 5, 6].map((i) => items[i]))
      expect(count).to.equal(2)
      expect(await db.digests()).to.deep.equal([
        'f6015930b9b4c8dfeaec33902f835711407fa3e0ad63f7c4daafeaa3b55c505a', // 7
        '2eaafe32f069588325a2487f23999506b5619f3c0e8a7113f7effa511dd95173', // 1
        '39b3d1263027fefa1b881599a099e9096a5cdab12eb156f336225de68e747f62' // 0
      ])
    })

    describe('private', function () {
      it('should calculate the _digest of an item', async function () {
        const item = helpers.makeItem(0)
        const want =
          '39b3d1263027fefa1b881599a099e9096a5cdab12eb156f336225de68e747f62'
        const got = db._digest(item)
        expect(got).to.equal(want)
      })
      it('should verify an item _exists', async function () {
        const item = helpers.makeItem(0)
        await orm.Item.create({ item })

        const exists = await db._exists(item)
        expect(exists).to.equal(true)
      })

      it('should detect a digest duplicate error: _isErrorDuplicateDigest', async function () {
        const item = helpers.makeItem(0)
        try {
          await orm.Item.create({ item })
        } catch (error) {
          const detect = db._isErrorDuplicateDigest(error)
          expect(detect).to.equal(true)
        }
      })
      it('should ignore a non digest duplicate error: _isErrorDuplicateDigest', async function () {
        const error = new Error('Some other error')
        const detect = db._isErrorDuplicateDigest(error)
        expect(detect).to.equal(false)
      })
    })
  })
})
