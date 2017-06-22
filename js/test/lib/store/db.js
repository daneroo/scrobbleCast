'use strict'
const expect = require('chai').expect

const orm = require('../../../lib/model/orm')
const db = require('../../../lib/store/db')
const helpers = require('../../helpers')

// const config = require('../../../api/config')

describe('store', function () {
  // this.timeout(20000)
  before(async () => {
    if (process.env.NODE_ENV !== 'test') {
      return Promise.reject(new Error('Tests must be run with NODE_ENV==test to ensure data safety'))
    }
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
      const item = helpers.makeItem(1)
      const ok = await db.save(item)
      expect(ok).to.equal(true)

      const got = await db.getByDigest(db._digest(item))
      expect(got).to.deep.equal(item)
    })

    // how about mocks...
    it.skip('should saveByBatch...', async () => {})
    it.skip('should saveAll...', async () => {})
    it.skip('should load...', async () => {})
    it.skip('should getByDigest when exists', async () => {})
    it.skip('should getByDigest when not found', async () => {})

    it('should get digests', async () => {
      const items = [1, 2, 3, 4]
        .map(i => helpers.makeItem(i))
        .map(it => it)
      await db.saveAll(items)

      const got = await db.digests({})
      expect(got).to.deep.equal([
        'b6029b4fe3cc47c68c5611e01d315a4be20fb3a39304b4255567a40bacc9b3ca',
        '2a87b34d35438cf1a0b696898f075b9cdcb156698f7edf86e337a220c92c0a22',
        '4c01804183b5f842c4b30407d2d117d1419e2a8e05ca7e986511497639f6c84a',
        '2eaafe32f069588325a2487f23999506b5619f3c0e8a7113f7effa511dd95173'
      ])
    })

    it.skip('should getByKey...', async () => {})
    it.skip('should remove...', async () => {})
    it.skip('should saveByBatch...', async () => {})

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
