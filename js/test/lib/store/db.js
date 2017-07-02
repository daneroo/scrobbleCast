'use strict'
const expect = require('chai').expect
const sinon = require('sinon')

const orm = require('../../../lib/model/orm')
const db = require('../../../lib/store/db')
const helpers = require('../../helpers')

describe('store', function () {
  // this.timeout(20000)
  before(async () => {
    if (process.env.NODE_ENV !== 'test') {
      throw new Error('Tests must be run with NODE_ENV==test to ensure data safety')
    }
  })
  beforeEach(async () => {
    await orm.sequelize.dropAllSchemas()
    await orm.sequelize.sync({ force: true })
  })

  describe('db', function () {
    it.skip('should initialise (open connections) the store', async () => {
    })
    it.skip('should end (close connections) the store', async () => {
    })
    it('should save an item', async () => {
      const item = helpers.makeItem(1)
      const ok = await db.save(item)
      expect(ok).to.equal(true)

      const got = await db.getByDigest(db._digest(item))
      expect(got).to.deep.equal(item)
    })
    it('should save an item without error if it already exists', async () => {
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

    it('should saveAll', async () => {
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
    it('should saveAll with duplicates', async () => {
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

    it('should saveByBatch is correct', async () => {
      const items = helpers.makeItems([1, 2, 3, 4])
      const saver = await db.saveByBatch(3)
      for (let item of items) {
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
    it('should saveByBatch with spies', async () => {
      const items = helpers.makeItems([1, 2, 3, 4])
      const saver = sinon.spy(db.saveByBatch(3))
      sinon.spy(saver, 'flush')

      for (let item of items) {
        const ok = await saver(item)
        expect(ok).to.equal(true)
      }
      // don't forget to flush()!
      const ok = await saver.flush()
      expect(ok).to.equal(true)

      expect(saver.callCount, 'saver called 4 times').to.equal(4)
      // TODO(daneroo): This spy is only called once, but the inner flush method is actually called twice
      //   - how can we assert that!
      expect(saver.flush.callCount, 'flush called twice').to.equal(1)

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

    it('should load and handle each item in the right order', async () => {
      // create in invers order as expected to be load'ed
      const items = helpers.makeItems([3, 2, 1])
      const ok = await db.saveAll(items)
      expect(ok).to.equal(true)

      const handler = sinon.spy()
      await db.load({filter: {__user: 'mock'}}, handler)

      expect(handler.callCount, 'handler called twice').to.equal(3)
      // ensure call order is __stamp ascending
      expect(handler.getCall(0).args[0], 'handler called first with item 2').to.deep.equal(items[2])
      expect(handler.getCall(1).args[0], 'handler called first with item 1').to.deep.equal(items[1])
      expect(handler.getCall(2).args[0], 'handler called first with item 0').to.deep.equal(items[0])
    })

    it('should load with appropriate filter by __user', async () => {
      const items = helpers.makeItems([1, 2])
      const ok = await db.saveAll(items)
      expect(ok).to.equal(true)

      const handler = sinon.spy()

      await db.load({filter: {__user: 'not-mock'}}, handler)
      expect(handler.callCount, 'handler not be called').to.equal(0)
    })

    it('should throw an error if load has missing filter.__ueser propery', async () => {
      const items = helpers.makeItems([1, 2])
      const ok = await db.saveAll(items)
      expect(ok).to.equal(true)

      const handler = sinon.spy()

      try {
        await db.load({}, handler)
        throw (new Error('should not reach this'))
      } catch (err) {
        expect(err.message).to.equal('file:load missing required opt filter.__user')
      }
      expect(handler.callCount, 'handler not be called').to.equal(0)
    })

    it('should getByDigest when exists', async () => {
      const item = helpers.makeItem(1)
      const ok = await db.save(item)
      expect(ok).to.equal(true)

      const got = await db.getByDigest(db._digest(item))
      expect(got).to.deep.equal(item)
    })

    it('should return null when getByDigest not found', async () => {
      const notexist = helpers.makeItem(2)
      const got = await db.getByDigest(db._digest(notexist))
      expect(got).to.equal(null)
    })

    it('should get digests', async () => {
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
    it('should get digests with time ranges', async () => {
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
            '2eaafe32f069588325a2487f23999506b5619f3c0e8a7113f7effa511dd95173'  // 2017-06-01T00:00:00Z
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
            '2eaafe32f069588325a2487f23999506b5619f3c0e8a7113f7effa511dd95173'  // 2017-06-01T00:00:00Z
          ]
        },
        {
          name: 'since and before',
          args: { since: '2017-06-02T00:00:00Z', before: '2017-06-04T00:00:00Z' },
          expected: [
            '2a87b34d35438cf1a0b696898f075b9cdcb156698f7edf86e337a220c92c0a22', // 2017-06-03T00:00:00Z
            '4c01804183b5f842c4b30407d2d117d1419e2a8e05ca7e986511497639f6c84a' // 2017-06-02T00:00:00Z
          ]
        },
        {
          name: 'empty (since > before)',
          args: { since: '2017-06-04T00:00:00Z', before: '2017-06-02T00:00:00Z' },
          expected: [ ]
        }
      ]

      for (let i = 0; i < data.length; i++) {
        const test = data[i]
        const got = await db.digests(test.args)
        expect(got, test.name).to.deep.equal(test.expected)
      }
    })

    it('should get digests of digests', async () => {
      const items = helpers.makeItems([1, 2, 3, 4])
      await db.saveAll(items)

      const got = await db.digestOfDigests()
      expect(got).to.equal('084bb7cb8df1c14bbb672ff64de3eb8e191468ef6db9b1ac68c577c60b01f7e4')
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

    it('should find an item with getByKey', async () => {
      const item = helpers.makeItem(1)
      const ok = await db.save(item)
      expect(ok).to.equal(true)

      const got = await db.getByKey(item)
      expect(got).to.deep.equal(item)
    })
    it('should return null getByKey(item) is not found', async () => {
      const item = helpers.makeItem(2)
      try {
        const got = await db.getByKey(item)
        expect(got).to.equal(null)
      } catch (err) {
        throw (new Error('should not reach this'))
      }
    })

    it('should remove an item if it exists and if it does\'nt', async () => {
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

      expect(await db.digests()).to.deep.equal([ ])
    })

    it('should remove an multiple items even if some are not present', async () => {
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
      let count = await db.removeAll([2, 4, 6].map(i => items[i]))
      expect(count).to.equal(3)
      expect(await db.digests()).to.deep.equal([
        'f6015930b9b4c8dfeaec33902f835711407fa3e0ad63f7c4daafeaa3b55c505a', // 7
        '053f344178c6d150a6644a1a673dff97227f341f6f08ad693a2399af5b4bf081', // 5
        '2a87b34d35438cf1a0b696898f075b9cdcb156698f7edf86e337a220c92c0a22', // 3
        '2eaafe32f069588325a2487f23999506b5619f3c0e8a7113f7effa511dd95173', // 1
        '39b3d1263027fefa1b881599a099e9096a5cdab12eb156f336225de68e747f62' // 0
      ])

      // removeAll(2,3,4,5,6) // items
      count = await db.removeAll([2, 3, 4, 5, 6].map(i => items[i]))
      expect(count).to.equal(2)
      expect(await db.digests()).to.deep.equal([
        'f6015930b9b4c8dfeaec33902f835711407fa3e0ad63f7c4daafeaa3b55c505a', // 7
        '2eaafe32f069588325a2487f23999506b5619f3c0e8a7113f7effa511dd95173', // 1
        '39b3d1263027fefa1b881599a099e9096a5cdab12eb156f336225de68e747f62' // 0
      ])
    })

    describe('private', function () {
      it('should calculate the _digest of an item', async () => {
        const item = helpers.makeItem(0)
        const want = '39b3d1263027fefa1b881599a099e9096a5cdab12eb156f336225de68e747f62'
        const got = db._digest(item)
        expect(got).to.equal(want)
      })
      it('should verify an item _exists', async () => {
        const item = helpers.makeItem(0)
        await orm.Item.create({ item: item })

        const exists = await db._exists(item)
        expect(exists).to.equal(true)
      })

      it('should detect a digest duplicate error: _isErrorDuplicateDigest', async () => {
        const item = helpers.makeItem(0)
        try {
          await orm.Item.create({ item: item })
        } catch (error) {
          const detect = db._isErrorDuplicateDigest(error)
          expect(detect).to.equal(true)
        }
      })
      it('should ignore a non digest duplicate error: _isErrorDuplicateDigest', async () => {
        const error = new Error('Some other error')
        const detect = db._isErrorDuplicateDigest(error)
        expect(detect).to.equal(false)
      })
    })
  })
})
